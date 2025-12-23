import { Request, Response, NextFunction } from "express";
import { prisma } from "#config/db.js";
import { serialize } from "#utils/serialize.js";

export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const loggedUser = req.user; // { id, role_type }

    if (!loggedUser?.id) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const user = await prisma.user_account.findUnique({
      where: {
        id: BigInt(loggedUser.id), // ✅ IMPORTANT (your id is BigInt)
      },
      select: {
        id: true,
        login_id: true,
        mobile_number: true,
        role_type: true,
        state_id: true,
        district_id: true,
        agency_id: true,
        is_active: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,

        state_committee: {
          select: {
            id: true,
            state_name: true,
            state_code: true,
          },
        },

        district_committee: {
          select: {
            id: true,
            district_name: true, // ⚠️ use exact column name
          },
        },

        agency_member: {
          select: {
            id: true,
            legal_name: true,
            trade_name: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({
      message: "Profile fetched successfully",
      data: serialize(user),
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    next(error);
  }
};
