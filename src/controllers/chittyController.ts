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
    // 🔹 Fetch logged-in user
    // -----------------------------
    const currentUser = await prisma.user_account.findUnique({
      where: { id: BigInt(user.id) },
      select: {
        id: true,
        role_type: true,
        state_id: true,
        district_id: true,
        agency_id: true,
      },
    });

    if (!currentUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    let whereCondition: any = {};

    // =====================================================
    // 🟢 AGENCY LOGIC
    // =====================================================
    if (currentUser.role_type === "AGENCY") {
      if (!currentUser.agency_id) {
        res.status(400).json({ message: "Agency not linked to user" });
        return;
      }

      // Fetch agency to get district_id
      const agency = await prisma.agency_member.findUnique({
        where: { id: currentUser.agency_id },
        select: { district_id: true },
      });

      if (!agency) {
        res.status(404).json({ message: "Agency not found" });
        return;
      }

      whereCondition = {
        OR: [
          // All STATE level chitty
          { level: "STATE" },

          // DISTRICT level chitty only for agency district
          {
            level: "DISTRICT",
            district_id: agency.district_id,
          },
        ],
      };
    }

    // =====================================================
    // 🟢 STATE LOGIC
    // =====================================================
    else if (currentUser.role_type === "STATE") {
      whereCondition = {
        OR: [
          // All DISTRICT level
          { level: "DISTRICT" },

          // STATE level only for same state
          {
            level: "STATE",
            state_id: currentUser.state_id,
          },
        ],
      };
    }

    // =====================================================
    // 🟢 DISTRICT LOGIC
    // =====================================================
    else if (currentUser.role_type === "DISTRICT") {
      whereCondition = {
        level: "DISTRICT",
        district_id: currentUser.district_id,
      };
    }

    // -----------------------------
    // 🔹 Fetch chitty schemes by status
    // -----------------------------
    const [open, running, closed] = await Promise.all([
  prisma.chitty_scheme.findMany({
    where: { status: "OPEN", ...whereCondition },
    include: {
      _count: {
        select: {
          chitty_member: {
            where: { join_status: "APPROVED" },
          },
        },
      },
    },
  }),

  prisma.chitty_scheme.findMany({
    where: { status: "RUNNING", ...whereCondition },
    include: {
      _count: {
        select: {
          chitty_member: {
            where: { join_status: "APPROVED" },
          },
        },
      },
    },
  }),

  prisma.chitty_scheme.findMany({
    where: { status: "CLOSED", ...whereCondition },
    include: {
      _count: {
        select: {
          chitty_member: {
            where: { join_status: "APPROVED" },
          },
        },
      },
    },
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


const mergeDateAndTime = (date: Date, time: Date): Date => {
  const merged = new Date(date);

  merged.setHours(
    time.getHours(),
    time.getMinutes(),
    time.getSeconds(),
    time.getMilliseconds()
  );

  return merged;
};

export const getChittyByid = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;

    if (!user?.id) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userId = BigInt(user.id);

    const userAcc = await prisma.user_account.findUnique({
      where: { id: userId },
      select: {
        id: true,
        district_id: true,
        state_id: true,
        agency_id: true,
      },
    });

    if (!userAcc) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const chitty = await prisma.chitty_scheme.findUnique({
      where: { id: BigInt(id) },
    });

    if (!chitty) {
      res.status(404).json({ message: "Chitty not found" });
      return;
    }

    // 🔹 LEVEL CHECK
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

    // 🔹 FETCH CYCLES ALWAYS
    const chittyCycles = await prisma.chitty_cycle.findMany({
      where: { chitty_id: BigInt(id),
        status:"OPEN"
       },
      orderBy: { cycle_no: "asc" },
    });

    const updatedCycles = chittyCycles.map((cycle) => ({
      ...cycle,
      cycle_start_date: mergeDateAndTime(
        cycle.cycle_start_date,
        chitty.lot_time
      ),
    }));

    // 🔹 FETCH MEMBER ONLY IF RUNNING
    let chittyMember = null;
    if (chitty.status === "RUNNING") {
      chittyMember = await prisma.chitty_member.findFirst({
        where: {
          chitty_id: BigInt(id),
          agency_id: userAcc.agency_id || BigInt(0),
        },
      });
    }

    res.status(200).json({
      message: "Chitty fetched successfully",
      chitty: serialize(chitty),
      chittyCycle: serialize(updatedCycles),
      chittyMember: serialize(chittyMember),
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

    const { chitty_id, remarks, number_of_req, join_date, exit_date } =
      req.body;

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
    const membersData = Array.from({ length: totalReq }, (_, index) => ({
      chitty_id: BigInt(chitty_id),
      agency_id: Number(userAcc.agency_id),
      member_no: 0,
      join_status: chitty_member_join_status.REQUESTED,
      remarks: remarks ?? null,
      join_date: joinDateParsed,
      exit_date: exitDateParsed,
    }));

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

    const { auction_id, chitty_id, month_index, bid_amount, member_no } =
      req.body;

    // -----------------------------
    // 🔹 Validation
    // -----------------------------
    if (
      !auction_id ||
      !chitty_id ||
      !month_index ||
      !bid_amount ||
      !member_no
    ) {
      res.status(400).json({
        success: false,
        message:
          "auction_id, chitty_id, month_index, bid_amount and member_no are required",
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
        member_id: BigInt(member_no),
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

export const GetChittyAuctionBids = async (
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

    const { id } = req.params; // chitty_id

    if (!id) {
      res.status(400).json({
        success: false,
        message: "chitty_id is required",
      });
      return;
    }

    // -----------------------------
    // 🔹 Step 1: Get highest bid amount
    // -----------------------------
    const maxBid = await prisma.chitty_auction_bid.aggregate({
      where: {
        chitty_id: Number(id),
      },
      _max: {
        bid_amount: true,
      },
    });

    if (!maxBid._max.bid_amount) {
      res.status(200).json({
        success: true,
        message: "No bids found",
        highest_bid_amount: null,
        highest_bids: [],
      });
      return;
    }

    // -----------------------------
    // 🔹 Step 2: Get all bids with highest amount
    // -----------------------------
    const highestBids = await prisma.chitty_auction_bid.findMany({
      where: {
        chitty_id: Number(id),
        bid_amount: maxBid._max.bid_amount,
      },
      orderBy: {
        bid_time: "asc", // optional: earliest bid first
      },
    });

    // -----------------------------
    // 🔹 Response
    // -----------------------------
    res.status(200).json({
      success: true,
      message: "Highest bid(s) fetched successfully",
      highest_bid_amount: maxBid._max.bid_amount,
      highest_bids: highestBids,
    });
  } catch (error) {
    console.error("Error fetching highest bids:", error);
    next(error);
  }
};
