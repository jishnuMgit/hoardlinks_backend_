import { prisma } from "#config/db.js";
import { NextFunction, Request, Response } from "express";
import { sendOtpMail } from "../utils/sendOtpMail.js";

import jwt from "jsonwebtoken";
import { sendPushNotification } from "../utils/sendNotification.js";

import bcrypt from "bcryptjs";
import { getDeviceType } from "##/utils/deviceType.js";
import { createFirebaseUserKey } from "##/utils/createFirebaseUser.js";
const JWT_SECRET = process.env.JWT_SECRET as string;

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      login_id,
      password,
      device_type,
      device_id,
      FCM_token, // 🔥 ADD THIS
    } = req.body;

    // ------------------------------
    // 🔹 BASIC VALIDATION
    // ------------------------------
    if (!device_type) {
      return res.status(400).json({
        success: false,
        message: "device_type is required.",
      });
    }

    if (device_type !== "WEB" && !device_id) {
      return res.status(400).json({
        success: false,
        message: "device_id is required for non-WEB devices.",
      });
    }

    if (!login_id || !password) {
      return res.status(400).json({
        success: false,
        message: "login_id and password are required.",
      });
    }

    // ------------------------------
    // 🔹 FIND USER
    // ------------------------------
    const user = await prisma.user_account.findUnique({
      where: { login_id },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid login_id or password.",
      });
    }

    // ------------------------------
    // 🔐 PASSWORD CHECK
    // ------------------------------
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid login_id or password.",
      });
    }

    // ------------------------------
    // 🔔 DEVICE TYPE DETECTION
    // ------------------------------
    const userAgent = req.headers["user-agent"];
    const detectedDeviceType = getDeviceType(userAgent);

    // ------------------------------
    // 🔑 ENSURE FIREBASE USER EXISTS
    // ------------------------------
    let firebaseUserKey = user.firebaseUserKey;

    if (!firebaseUserKey) {
      firebaseUserKey = await createFirebaseUserKey(
        user.id.toString(),
        user.login_id
      );
    }

    // ------------------------------
    // 🔄 UPDATE USER (INCLUDING FCM TOKEN)
    // ------------------------------
    const updatedUser = await prisma.user_account.update({
      where: { id: user.id },
      data: {
        deviceType: device_type || detectedDeviceType,
        device_id: device_id ?? user.device_id,
        firebaseUserKey,
        FCM_token: FCM_token ?? user.FCM_token, // 🔔 IMPORTANT
      },
    });

    // ------------------------------
    // 🔑 GENERATE JWT
    // ------------------------------
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not set.");
    }

    const tokenPayload = {
      id: updatedUser.id.toString(),
      role_type: updatedUser.role_type,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: "1d",
    });

    // ------------------------------
    // 🍪 SET COOKIE
    // ------------------------------
    res.cookie("access_token", token, {
      httpOnly: true,
      secure: false, // true in production
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    // ------------------------------
    // ✅ RESPONSE
    // ------------------------------
    return res.status(200).json({
      success: true,
      message: "Login successful.",
      access_token: token,
      role_type: updatedUser.role_type,
      user: convertBigInt(updatedUser),
    });
  } catch (error) {
    console.error("Login Error:", error);
    next(error);
  }
};

const convertBigInt = (obj: any) =>
  JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );

export const Register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      login_id,
      password,
      mobile_number,
      role_type,
      state_id,
      district_id,
      email,
      agency_id,
      fcm_token,
      device_id,
      device_type: bodyDeviceType,
    } = req.body;

    const loggedUser = req.user; // { id, role_type }
    const creatorRole = loggedUser?.role_type;

    // ------------------------------
    // 🔹 BASIC VALIDATION
    // ------------------------------
    if (!login_id || !password || !mobile_number || !role_type) {
      return res.status(400).json({
        success: false,
        message:
          "login_id, password, mobile_number, and role_type are required.",
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "email is required.",
      });
    }
    // ------------------------------
    // 🔥 ROLE-BASED PERMISSION CHECK
    // ------------------------------
    const allowedRoles: Record<string, string[]> = {
      ADMIN: ["ADMIN", "STATE", "DISTRICT", "AGENCY"],
      STATE: ["STATE", "DISTRICT", "AGENCY"],
      DISTRICT: ["DISTRICT", "AGENCY"],
      AGENCY: ["AGENCY"],
    };

    // Allow first ADMIN creation (system bootstrap)
    if (role_type === "ADMIN") {
      const adminCount = await prisma.user_account.count({
        where: { role_type: "ADMIN" },
      });

      if (adminCount > 0 && creatorRole !== "ADMIN") {
        return res.status(403).json({
          success: false,
          message: "Only ADMIN users can create another ADMIN.",
        });
      }
    } else {
      if (!allowedRoles[creatorRole]?.includes(role_type)) {
        return res.status(403).json({
          success: false,
          message: `You are not allowed to create a user with role_type ${role_type}.`,
        });
      }
    }

    // ------------------------------
    // 🔹 ROLE-BASED ID VALIDATION
    // ------------------------------
    if (role_type === "ADMIN" && (state_id || district_id || agency_id)) {
      return res.status(400).json({
        success: false,
        message: "ADMIN role cannot have state_id, district_id, or agency_id.",
      });
    }

    if (role_type === "STATE" && !state_id) {
      return res.status(400).json({
        success: false,
        message: "state_id is required for STATE role.",
      });
    }

    if (role_type === "DISTRICT" && !district_id) {
      return res.status(400).json({
        success: false,
        message: "district_id is required for DISTRICT role.",
      });
    }

    if (role_type === "AGENCY" && !agency_id) {
      return res.status(400).json({
        success: false,
        message: "agency_id is required for AGENCY role.",
      });
    }

    // ❌ Prevent invalid combinations
    if (role_type === "STATE" && (district_id || agency_id)) {
      return res.status(400).json({
        success: false,
        message: "STATE role cannot have district_id or agency_id.",
      });
    }

    if (role_type === "DISTRICT" && (state_id || agency_id)) {
      return res.status(400).json({
        success: false,
        message: "DISTRICT role cannot have state_id or agency_id.",
      });
    }

    if (role_type === "AGENCY" && (state_id || district_id)) {
      return res.status(400).json({
        success: false,
        message: "AGENCY role cannot have state_id or district_id.",
      });
    }

    // ------------------------------
    // 🔹 DUPLICATE CHECKS
    // ------------------------------
    const existingUser = await prisma.user_account.findUnique({
      where: { login_id },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Login ID already exists.",
      });
    }

    const existingPhone = await prisma.user_account.findFirst({
      where: { mobile_number },
    });

    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: "Mobile number already exists.",
      });
    }

    // ------------------------------
    // 🔐 HASH PASSWORD
    // ------------------------------
    const password_hash = await bcrypt.hash(password, 10);

    // ------------------------------
    // 🔔 DEVICE TYPE DECISION
    // ------------------------------
    const userAgent = req.headers["user-agent"];
    const deviceType =
      bodyDeviceType ?? (fcm_token ? getDeviceType(userAgent) : null);

    // ------------------------------
    // 🔹 NORMALIZE ROLE-BASED IDS
    // ------------------------------
    let stateId: number | null = null;
    let districtId: number | null = null;
    let agencyId: number | null = null;

    if (role_type === "STATE") stateId = Number(state_id);
    if (role_type === "DISTRICT") districtId = Number(district_id);
    if (role_type === "AGENCY") agencyId = Number(agency_id);
    // ADMIN → all null

    // ------------------------------
    // 🔹 CREATE USER
    // ------------------------------
    const newUser = await prisma.user_account.create({
      data: {
        login_id,
        email,
        code: "",
        password_hash,
        mobile_number,
        role_type,
        device_id: device_id ?? null,
        state_id: stateId,
        district_id: districtId,
        agency_id: agencyId,
        FCM_token: fcm_token ?? null,
        deviceType,
        firebaseUserKey: "",
      },
    });

    // ------------------------------
    // 🔑 FIREBASE KEY
    // ------------------------------
    const firebaseUserKey = await createFirebaseUserKey(
      newUser.id.toString(),
      newUser.login_id
    );

    await prisma.user_account.update({
      where: { id: newUser.id },
      data: { firebaseUserKey },
    });

    // ------------------------------
    // 🔔 WELCOME PUSH
    // ------------------------------
    if (newUser.FCM_token) {
      await sendPushNotification(
        newUser.FCM_token,
        "Welcome 🎉",
        "Your account has been created successfully"
      );
    }

    // ------------------------------
    // ✅ RESPONSE
    // ------------------------------
    return res.status(201).json({
      success: true,
      message: "User registered successfully.",
      data: convertBigInt(newUser),
    });
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
  } catch (error) {
    next(error);
  }
};

export const CreateUserRaw = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      login_id,
      password,
      mobile_number,
      role_type,
      email,
      state_id,
      district_id,
      agency_id,
      fcm_token,
      device_id,
      device_type,
    } = req.body;

    // ------------------------------
    // 🔹 BASIC REQUIRED CHECK
    // ------------------------------
    if (!login_id || !password || !mobile_number || !role_type) {
      return res.status(400).json({
        success: false,
        message: "login_id, password, mobile_number, role_type are required",
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "email is required.",
      });
    }
    // ------------------------------
    // 🔹 DUPLICATE CHECK
    // ------------------------------
    const exists = await prisma.user_account.findFirst({
      where: {
        OR: [{ login_id }, { mobile_number }],
      },
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Login ID or mobile number already exists",
      });
    }

    // ------------------------------
    // 🔐 HASH PASSWORD
    // ------------------------------
    const password_hash = await bcrypt.hash(password, 10);

    // ------------------------------
    // ✅ INSERT EVERYTHING AS-IS
    // ------------------------------
    const user = await prisma.user_account.create({
      data: {
        login_id,
        password_hash,
        mobile_number,
        email,
        code: "",
        role_type,
        device_id: device_id ?? "",
        deviceType: device_type ?? "",
        FCM_token: fcm_token ?? "",
        firebaseUserKey: "",
        state_id: state_id ? Number(state_id) : null,
        district_id: district_id ? Number(district_id) : null,
        agency_id: agency_id ? Number(agency_id) : null,
      },
    });

    // ------------------------------
    // 🔑 FIREBASE KEY
    // ------------------------------
    const firebaseUserKey = await createFirebaseUserKey(
      user.id.toString(),
      user.login_id
    );

    await prisma.user_account.update({
      where: { id: user.id },
      data: { firebaseUserKey },
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully (raw insert)",
      data: convertBigInt(user),
    });
  } catch (error) {
    console.error("CreateUserRaw Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email } = req.body;

  try {
    const user = await prisma.user_account.findFirst({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    const code = Math.floor(1000 + Math.random() * 9000).toString();

    await prisma.user_account.update({
      where: { id: user.id },
      data: { code },
    });

    // 🔹 Respond FIRST (important)
    res.status(200).json({
      success: true,
      message: "OTP sent to email",
    });

    // 🔹 Send email AFTER response
    sendOtpMail(user.email, code).catch(err => {
      console.error("Email sending failed:", err);
    });

  } catch (error) {
    next(error);
  }
};


export const forgotloginID = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    const user = await prisma.user_account.findFirst({
      where: { email },
      select: { login_id: true, mobile_number: true, email: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No user found with the provided email.",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Login ID retrieved successfully.",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.resetUser?.userId;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Invalid request. User ID missing.",
      });
    }
    const { newPassword, code } = req.body;
    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: "newPassword is required.",
      });
    }
    if (!code) {
      return res.status(400).json({
        success: false,
        message: "OTP code is required.",
      });
    }

    const user = await prisma.user_account.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }
    if (user.code !== code) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP code.",
      });
    }
    const password_hash = await bcrypt.hash(newPassword, 10);

    await prisma.user_account.update({
      where: { id: userId },
      data: { password_hash, code: "" },
    });
    return res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
