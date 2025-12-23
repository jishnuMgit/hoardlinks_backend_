import { Request, Response, NextFunction } from "express";
import { prisma } from "#config/db.js";
import { serialize } from "#utils/serialize.js";
import { run } from "node:test";

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

    res.status(200).json({
      message: "Chittys fetched successfully",

      open: serialize(Openchittys),
      running: serialize(RunningChicktys),

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
