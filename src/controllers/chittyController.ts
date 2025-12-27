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
    const Openchittys = await prisma.chitty_scheme.findMany({
      where: {status: "OPEN"},
    });

    const RunningChicktys = await prisma.chitty_scheme.findMany({
      where: {status: "RUNNING"},
    });

    
    const ClosedChicktys = await prisma.chitty_scheme.findMany({
      where: {status: "CLOSED"},
    });

    res.status(200).json({
      message: "Chittys fetched successfully",

      open: serialize(Openchittys),
      running: serialize(RunningChicktys),
      closed: serialize(ClosedChicktys),

    });
  } catch (error) {
    console.error("Error fetching profile:", error);
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

