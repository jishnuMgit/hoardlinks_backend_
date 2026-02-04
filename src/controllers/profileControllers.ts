import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db.js";
import { serialize } from "../utils/serialize.js";
import bcrypt from "bcrypt";

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
        img_url: true,
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



export const updateUserAccount = async (
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

    // -----------------------------
    // 🔹 Allowed fields
    // -----------------------------
    const {
      mobile_number,
      state_id,
      district_id,
      login_id,
      agency_id,
      email,
      FCM_token,
      device_id,
      deviceType,
      is_active,
      last_login_at,
    } = req.body;

    // -----------------------------
    // 🔹 Check login_id uniqueness (ONLY if provided)
    // -----------------------------
    if (login_id !== undefined && login_id !== currentUser.login_id) {
      const userExists = await prisma.user_account.findFirst({
        where: {
          login_id: login_id,
          NOT: {
            id: BigInt(user.id),
          },
        },
      });

      if (userExists) {
        res.status(400).json({
          message: "Login ID already in use by another user",
        });
        return;
      }
    }
  if (email !== undefined && email !== currentUser.email) {
  const emailExists = await prisma.user_account.findFirst({
    where: {
      email,
      NOT: {
        id: BigInt(user.id),
      },
    },
  });

  if (emailExists) {
    res.status(400).json({
      message: "Email already in use by another user",
    });
    return;
  }
}


    // -----------------------------
    // 🔹 Build update object safely
    // -----------------------------
    const updateData: any = {
      updated_at: new Date(),
    };

    if (email !== undefined)
      updateData.email = email;
    if (mobile_number !== undefined)
      updateData.mobile_number = mobile_number;

    if (login_id !== undefined)
      updateData.login_id = login_id;

    if (FCM_token !== undefined)
      updateData.FCM_token = FCM_token;

    if (device_id !== undefined)
      updateData.device_id = device_id;

    if (deviceType !== undefined)
      updateData.deviceType = deviceType;

    if (is_active !== undefined)
      updateData.is_active = is_active;

    if (last_login_at !== undefined)
      updateData.last_login_at = new Date(last_login_at);

    // -----------------------------
    // 🔹 Relations (BigInt-safe)
    // -----------------------------
    if (state_id !== undefined)
      updateData.state_id = state_id ? BigInt(state_id) : null;

    if (district_id !== undefined)
      updateData.district_id = district_id ? BigInt(district_id) : null;

    if (agency_id !== undefined)
      updateData.agency_id = agency_id ? BigInt(agency_id) : null;

    // -----------------------------
    // 🔹 Prevent empty update
    // -----------------------------
    if (Object.keys(updateData).length === 1) {
      res.status(400).json({ message: "No fields provided to update" });
      return;
    }

    // -----------------------------
    // 🔹 Update user
    // -----------------------------
    const updatedUser = await prisma.user_account.update({
      where: { id: BigInt(user.id) },
      data: updateData,
      select: {
        id: true,
        login_id: true,
        mobile_number: true,
        email: true,
        role_type: true,
        state_id: true,
        district_id: true,
        agency_id: true,
        is_active: true,
        updated_at: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};


export const updatePassword = async (
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

    const { oldPassword, newPassword } = req.body;

    // -----------------------------
    // 🔹 Validation
    // -----------------------------
    if (!oldPassword || !newPassword) {
      res.status(400).json({
        message: "Old password and new password are required",
      });
      return;
    }

    if (oldPassword === newPassword) {
      res.status(400).json({
        message: "New password must be different from old password",
      });
      return;
    }

    // -----------------------------
    // 🔹 Fetch user
    // -----------------------------
    const currentUser = await prisma.user_account.findUnique({
      where: { id: BigInt(user.id) },
    });

    console.log("currentUser",currentUser);
    
    if (!currentUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // -----------------------------
    // 🔹 Verify old password
    // -----------------------------
    const isMatch = await bcrypt.compare(
      oldPassword,
      currentUser.password_hash
    );

    if (!isMatch) {
      res.status(400).json({ message: "Old password is incorrect" });
      return;
    }

    // -----------------------------
    // 🔹 Hash new password
    // -----------------------------
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // -----------------------------
    // 🔹 Update password
    // -----------------------------
    await prisma.user_account.update({
      where: { id: BigInt(user.id) },
      data: {
        password_hash: hashedPassword,
        updated_at: new Date(),
      },
    });

    res.status(200).json({
      message: "Password updated successfully",
    });
  } catch (error) {
    next(error);
  }
};
