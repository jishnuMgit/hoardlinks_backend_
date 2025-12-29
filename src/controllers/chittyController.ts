import { Request, Response, NextFunction } from "express";
import { prisma } from "#config/db.js";
import { serialize } from "#utils/serialize.js";
// import { run } from "node:test";
import { chitty_member_join_status } from "@prisma/client";

export const getChitty = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;

    // -----------------------------
    // 🔹 Auth check
    // -----------------------------
    if (!user?.id) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // -----------------------------
    // 🔹 Get logged-in user
    // -----------------------------
    const currentUser = await prisma.user_account.findUnique({
      where: { id: BigInt(user.id) },
      select: {
        id: true,
        role_type: true,
        state_id: true,
        district_id: true,
      },
    });

    if (!currentUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // -----------------------------
    // 🔹 Build dynamic filter
    // -----------------------------
    let whereCondition: any = {};

    if (currentUser.role_type === "AGENCY") {
      // AGENCY → All STATE level chitty
      whereCondition = {
        level: "STATE",
      };
    }

    else if (currentUser.role_type === "STATE") {
      // STATE → All DISTRICT + own STATE
      whereCondition = {
        OR: [
          { level: "DISTRICT" },
          {
            level: "STATE",
            state_id: currentUser.state_id,
          },
        ],
      };
    }

    else if (currentUser.role_type === "DISTRICT") {
      // DISTRICT → Only own DISTRICT
      whereCondition = {
        level: "DISTRICT",
        district_id: currentUser.district_id,
      };
    }

    // -----------------------------
    // 🔹 Fetch chitty by status
    // -----------------------------
    const [open, running, closed] = await Promise.all([
      prisma.chitty_scheme.findMany({
        where: { status: "OPEN", ...whereCondition },
      }),
      prisma.chitty_scheme.findMany({
        where: { status: "RUNNING", ...whereCondition },
      }),
      prisma.chitty_scheme.findMany({
        where: { status: "CLOSED", ...whereCondition },
      }),
    ]);

    // -----------------------------
    // 🔹 Response
    // -----------------------------
    res.status(200).json({
      message: "Chitty schemes fetched successfully",
      open: serialize(open),
      running: serialize(running),
      closed: serialize(closed),
    });

  } catch (error) {
    console.error("Error fetching chitty schemes:", error);
    next(error);
  }
};


export const getChittyByid = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;

    console.log('user',user);
    

    if (!user?.id) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userId = BigInt(user.id);

    // 🔹 Fetch logged-in user
    const userAcc = await prisma.user_account.findUnique({
      where: { id: userId },
      select: {
        id: true,
        district_id: true,
        state_id: true,
        agency_id : true,
      },
    });

    if (!userAcc) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // 🔹 Fetch chitty
    const chitty = await prisma.chitty_scheme.findUnique({
      where: { id: BigInt(id) },
    });

    if (!chitty) {
      res.status(404).json({ message: "Chitty not found" });
      return;
    }

    // 🔹 LEVEL BASED ACCESS CONTROL
    if (chitty.level === "DISTRICT") {
      if (
        !chitty.district_id ||
        !userAcc.district_id ||
        chitty.district_id !== userAcc.district_id
      ) {
        res.status(403).json({
          message: "You are not allowed to view this district chitty",
        });
        return;
      }
    }

    // 🔹 IF CHITTY IS RUNNING → SHOW MEMBER DATA
    if (chitty.status === "RUNNING") {
      const chittyMember = await prisma.chitty_member.findFirst({
        where: {
          chitty_id: BigInt(id),
          agency_id: userAcc.agency_id || BigInt(0),
        },
        include: {
          chitty_cycle: true, // optional if needed
        },
      });

      res.status(200).json({
        message: "Chitty fetched successfully",
        chitty: serialize(chitty),
        chittyMember: serialize(chittyMember),
      });
      return;
    }

    // 🔹 ELSE → SHOW CYCLES
    const chittyCycle = await prisma.chitty_cycle.findMany({
      where: {
        chitty_id: BigInt(id),
      },
      orderBy: {
        cycle_no: "asc",
      },
    });

    res.status(200).json({
      message: "Chitty fetched successfully",
      chitty: serialize(chitty),
      chittyCycle: serialize(chittyCycle),
    });

  } catch (error) {
    console.error("Error fetching chitty:", error);
    next(error);
  }
};



export const joinChitty = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;

    // -----------------------------
    // 🔹 Auth check
    // -----------------------------
    if (!user?.id) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // -----------------------------
    // 🔹 Fetch agency
    // -----------------------------
    const userAcc = await prisma.user_account.findUnique({
      where: { id: BigInt(user.id) },
      select: { agency_id: true },
    });

    if (!userAcc?.agency_id) {
      res.status(400).json({
        success: false,
        message: "Agency not linked to this user.",
      });
      return;
    }

    const {
      chitty_id,
      remarks,
      number_of_req,
      join_date,
      exit_date,
    } = req.body;

    const totalReq = Number(number_of_req);

    // -----------------------------
    // 🔹 Validation
    // -----------------------------
    if (!chitty_id || !totalReq || totalReq <= 0) {
      res.status(400).json({
        success: false,
        message: "chitty_id and valid number_of_req are required.",
      });
      return;
    }

    // -----------------------------
    // 🔹 Date parsing
    // -----------------------------
    const joinDateParsed = join_date ? new Date(join_date) : null;
    const exitDateParsed = exit_date ? new Date(exit_date) : null;

    if (
      (join_date && isNaN(joinDateParsed!.getTime())) ||
      (exit_date && isNaN(exitDateParsed!.getTime()))
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD.",
      });
      return;
    }

    // -----------------------------
    // 🔹 Get LAST member_no for this chitty
    // -----------------------------
    const lastMember = await prisma.chitty_member.findFirst({
      where: {
        chitty_id: BigInt(chitty_id),
      },
      orderBy: {
        member_no: "desc",
      },
      select: {
        member_no: true,
      },
    });

    const startMemberNo = lastMember ? lastMember.member_no + 1 : 1;

    // -----------------------------
    // 🔹 Prepare bulk data
    // -----------------------------
    const membersData = Array.from(
      { length: totalReq },
      (_, index) => ({
        chitty_id: BigInt(chitty_id),
        agency_id: Number(userAcc.agency_id),
        member_no: startMemberNo + index,
        join_status: chitty_member_join_status.REQUESTED,
        remarks: remarks ?? null,
        join_date: joinDateParsed,
        exit_date: exitDateParsed,
      })
    );

    // -----------------------------
    // 🔹 Insert
    // -----------------------------
    const result = await prisma.chitty_member.createMany({
      data: membersData,
    });

    res.status(201).json({
      success: true,
      start_member_no: startMemberNo,
      end_member_no: startMemberNo + totalReq - 1,
      inserted: result.count,
      message: "Chitty members created successfully.",
    });
  } catch (error) {
    console.error("Error creating chitty member:", error);
    next(error);
  }
};



export const ChittyAuctionBid = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;

    // -----------------------------
    // 🔹 Auth check
    // -----------------------------
    if (!user?.id) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { auction_id, chitty_id, month_index, bid_amount } = req.body;

    // -----------------------------
    // 🔹 Validation
    // -----------------------------
    if (!auction_id || !chitty_id || !month_index || !bid_amount) {
      res.status(400).json({
        success: false,
        message: "auction_id, chitty_id, month_index and bid_amount are required",
      });
      return;
    }

    if (Number(bid_amount) <= 0) {
      res.status(400).json({
        success: false,
        message: "Bid amount must be greater than zero",
      });
      return;
    }

    // -----------------------------
    // 🔹 Check existing winning bid
    // -----------------------------
    // const existingWinningBid = await prisma.chitty_auction_bid.findFirst({
    //   where: {
    //     auction_id: BigInt(auction_id),
    //     month_index,
    //     is_winning_bid: true,
    //   },
    // });

    // if (existingWinningBid) {
    //   res.status(400).json({
    //     success: false,
    //     message: "Winning bid already exists for this auction month",
    //   });
    //   return;
    // }

    // -----------------------------
    // 🔹 Create Bid
    // -----------------------------
    const bid = await prisma.chitty_auction_bid.create({
      data: {
        auction_id: BigInt(auction_id),
        chitty_id,
        month_index,
        member_id: BigInt(user.id),
        bid_amount,
        is_winning_bid: false,
      },
    });

    res.status(201).json({
      success: true,
      message: "Bid placed successfully",
      data: bid,
    });
  } catch (error) {
    console.error("Error creating chitty auction bid:", error);
    next(error);
  }
};
