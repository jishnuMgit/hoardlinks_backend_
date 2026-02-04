import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db.js";
import { serialize } from "../utils/serialize.js";
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

      const agencyId = currentUser.agency_id;

      const agency = await prisma.agency_member.findUnique({
        where: { id: agencyId },
        select: { district_id: true },
      });

      if (!agency) {
        res.status(404).json({ message: "Agency not found" });
        return;
      }

      whereCondition = {
        OR: [
          { level: "STATE" },
          { level: "DISTRICT", district_id: currentUser.district_id },
        ],
      };

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

        // 🟡 RUNNING
        prisma.chitty_scheme.findMany({
          where: {
            status: "RUNNING",
            ...whereCondition,
            chitty_member: {
              some: {
                join_status: "APPROVED",
                agency_id: agencyId,
              },
            },
          },
          include: {
            _count: {
              select: {
                chitty_member: {
                  where: {
                    join_status: "APPROVED",
                    agency_id: agencyId,
                  },
                },
              },
            },
          },
        }),

        // 🔴 CLOSED
        prisma.chitty_scheme.findMany({
          where: {
            status: "CLOSED",
            ...whereCondition,
            chitty_member: {
              some: {
                join_status: "APPROVED",
                agency_id: agencyId,
              },
            },
          },
          include: {
            _count: {
              select: {
                chitty_member: {
                  where: {
                    join_status: "APPROVED",
                    agency_id: agencyId,
                  },
                },
              },
            },
          },
        }),
      ]);

      res.status(200).json({
        message: "Chitty schemes fetched successfully",
        open: serialize(open),
        running: serialize(running),
        closed: serialize(closed),
        agency: serialize(agencyId),
      });
      return;
    }

    // =====================================================
    // 🟢 STATE LOGIC
    // =====================================================
    if (currentUser.role_type === "STATE") {
      whereCondition = {
        OR: [
          { level: "DISTRICT" },
          { level: "STATE", state_id: currentUser.state_id },
        ],
      };
    }

    // =====================================================
    // 🟢 DISTRICT LOGIC
    // =====================================================
    if (currentUser.role_type === "DISTRICT") {
      whereCondition = {
        level: "DISTRICT",
        district_id: currentUser.district_id,
      };
    }

    const agencyId = BigInt(currentUser.agency_id || 0);

    const [open, running, closed] = await Promise.all([
      // 🟢 OPEN
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

      // 🟡 RUNNING
      prisma.chitty_scheme.findMany({
        where: {
          status: "RUNNING",
          ...whereCondition,
          chitty_member: {
            some: {
              join_status: "APPROVED",
              agency_id: agencyId,
            },
          },
        },
        include: {
          _count: {
            select: {
              chitty_member: {
                where: {
                  join_status: "APPROVED",
                  agency_id: agencyId,
                },
              },
            },
          },
        },
      }),

      // 🔴 CLOSED
      prisma.chitty_scheme.findMany({
        where: {
          status: "CLOSED",
          ...whereCondition,
          chitty_member: {
            some: {
              join_status: "APPROVED",
              agency_id: agencyId,
            },
          },
        },
        include: {
          _count: {
            select: {
              chitty_member: {
                where: {
                  join_status: "APPROVED",
                  agency_id: agencyId,
                },
              },
            },
          },
        },
      }),
    ]);

    res.status(200).json({
      message: "Chitty schemes fetched successfully",
      open: serialize(open),
      running: serialize(running),
      closed: serialize(closed),
      agency: serialize(agencyId),
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

    // -----------------------------
    // 🔹 AUTH CHECK
    // -----------------------------
    if (!user?.id) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userId = BigInt(user.id);

    // -----------------------------
    // 🔹 FETCH USER ACCOUNT
    // -----------------------------
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

    // -----------------------------
    // 🔹 FETCH CHITTY
    // -----------------------------
    const chitty = await prisma.chitty_scheme.findUnique({
      where: { id: BigInt(id) },
    });

    if (!chitty) {
      res.status(404).json({ message: "Chitty not found" });
      return;
    }

    // -----------------------------
    // 🔹 LEVEL CHECK
    // -----------------------------
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

    // -----------------------------
    // 🔹 FETCH ALL CYCLES
    // -----------------------------
    const chittyCycles = await prisma.chitty_cycle.findMany({
      where: { chitty_id: BigInt(id) },
      orderBy: { cycle_no: "asc" },
    });

    // -----------------------------
    // 🔹 MERGE DATE + LOT TIME
    // -----------------------------
    const updatedCycles = chittyCycles.map((cycle) => ({
      ...cycle,
      cycle_start_date: mergeDateAndTime(
        cycle.cycle_start_date,
        chitty.lot_time
      ),
    }));

    // -----------------------------
    // 🔹 FIND OPEN CYCLE
    // -----------------------------
    const openCycle = updatedCycles.find((cycle) => cycle.status === "OPEN");

    // -----------------------------
    // 🔹 SET CHITTY COUNTDOWN
    // -----------------------------
    const chittyCountdown = openCycle ? openCycle.cycle_start_date : null;

    // -----------------------------
    // 🔹 FETCH MEMBER (ONLY IF RUNNING)
    // -----------------------------
    let chittyMember = null;
    if (chitty.status === "RUNNING" || chitty.status === "OPEN") {
      chittyMember = await prisma.chitty_member.findMany({
        where: {
          chitty_id: BigInt(id),
          agency_id: userAcc.agency_id || BigInt(0),
        },
      });
    }

    // -----------------------------
    // 🔹 FINAL RESPONSE
    // -----------------------------
    res.status(200).json({
      message: "Chitty fetched successfully",
      chitty: {
        ...serialize(chitty),
        chitty_countdown: chittyCountdown,
      },
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

    // -------------------------------------------------
    // 🔹 AUTH CHECK
    // -------------------------------------------------
    if (!user?.id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    // -------------------------------------------------
    // 🔹 FETCH USER AGENCY
    // -------------------------------------------------
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

    // -------------------------------------------------
    // 🔹 REQUEST BODY
    // -------------------------------------------------
    const { chitty_id, remarks, number_of_req, join_date, exit_date } =
      req.body;

    const totalReq = Number(number_of_req);

    if (!chitty_id || !totalReq || totalReq <= 0) {
      res.status(400).json({
        success: false,
        message: "chitty_id and valid number_of_req are required.",
      });
      return;
    }

    // -------------------------------------------------
    // 🔹 DATE PARSING
    // -------------------------------------------------
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

    // -------------------------------------------------
    // 🔹 TRANSACTION (CRITICAL)
    // -------------------------------------------------
    const result = await prisma.$transaction(async (tx) => {
      // Get last member number for this chitty
      const lastMember = await tx.chitty_member.findFirst({
        where: { chitty_id: BigInt(chitty_id) },
        orderBy: { member_no: "desc" },
        select: { member_no: true },
      });

      const startMemberNo = lastMember ? lastMember.member_no + 1 : 1;

      // Prepare bulk insert data
      const membersData = Array.from({ length: totalReq }, (_, index) => ({
        chitty_id: BigInt(chitty_id),
        agency_id: BigInt(userAcc.agency_id || 0),
        member_no: startMemberNo + index, // ✅ UNIQUE & SEQUENTIAL
        join_status: chitty_member_join_status.REQUESTED,
        remarks: remarks ?? null,
        join_date: joinDateParsed,
        exit_date: exitDateParsed,
      }));

      const insertResult = await tx.chitty_member.createMany({
        data: membersData,
      });

      return {
        insertResult,
        startMemberNo,
      };
    });

    // -------------------------------------------------
    // 🔹 RESPONSE
    // -------------------------------------------------
    res.status(201).json({
      success: true,
      message: "Chitty members created successfully.",
      inserted: result.insertResult.count,
      start_member_no: result.startMemberNo,
      end_member_no: result.startMemberNo + totalReq - 1,
    });
  } catch (error) {
    console.error("Error joining chitty:", error);
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

export const GetAuctionBidId = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { chitty_id, cycle_id } = req.params;
    const user = req.user;

    // 🔹 Auth check
    if (!user?.id) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // 🔹 Validation
    if (!chitty_id || !cycle_id) {
      res.status(400).json({
        message: "chitty_id and cycle_id are required",
      });
      return;
    }

    const bid = await prisma.chitty_auction.findMany({
      where: {
        chitty_id: Number(chitty_id),
        cycle_id: Number(cycle_id),
      },
    });

    if (bid.length === 0) {
      res.status(404).json({ message: "No auction found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Auction fetched successfully",
      data: bid,
    });
  } catch (error) {
    console.error("Error fetching auction:", error);
    next(error);
  }
};
