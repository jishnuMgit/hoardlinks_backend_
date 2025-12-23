import { prisma } from "#config/db.js";
import { NextFunction, Request, Response } from "express";
import createError from "http-errors";
import { COOKIE_NAME, COOKIE_OPTIONS, redisLog } from "#config/index.js";
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
      device_type
    } = req.body;


    if(!device_type){      return res.status(400).json({
        success: false,
        message: "device_type is required.",
      });
      }
    // ------------------------------
    // 🔹 BASIC VALIDATION
    // ------------------------------
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
    // 🔐 COMPARE PASSWORD
    // ------------------------------
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid login_id or password.",
      });
    }

    // ------------------------------
    // 🔔 DEVICE TYPE DECISION
    // ------------------------------
    const userAgent = req.headers["user-agent"];

    const deviceType = getDeviceType(userAgent);

    // ------------------------------
    // 🔄 UPDATE DEVICE TYPE ONLY
    // ------------------------------
    await prisma.user_account.update({
      where: { id: user.id },
      data: {
        deviceType: device_type || deviceType,
      },
    });

    // ------------------------------
    // 🔑 GENERATE JWT
    // ------------------------------
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not set.");
    }

    const tokenPayload = {
      id: user.id.toString(),
      role_type: user.role_type,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: "1d",
    });

    // ------------------------------
    // 🍪 SET COOKIE
    // ------------------------------
    res.cookie("access_token", token, {
      httpOnly: true,
      secure: false, // true in production (HTTPS)
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
      role_type: user.role_type,
      user: convertBigInt(user),
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
      agency_id,
      fcm_token,
      device_type: bodyDeviceType, // may or may not come
    } = req.body;

    // Logged-in creator user (from auth middleware)
    const loggedUser = req.user; // { id, role_type }

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

    // ------------------------------
    // 🔥 ROLE-BASED PERMISSION CHECK
    // ------------------------------
    const creatorRole = loggedUser?.role_type;

    const allowedRoles: Record<string, string[]> = {
      STATE: ["STATE", "DISTRICT", "AGENCY"],
      DISTRICT: ["DISTRICT", "AGENCY"],
      AGENCY: ["AGENCY"],
    };

    if (!allowedRoles[creatorRole]?.includes(role_type)) {
      return res.status(403).json({
        success: false,
        message: `You are not allowed to create a user with role_type ${role_type}.`,
      });
    }

    // ------------------------------
    // 🔹 ROLE-BASED ID VALIDATION
    // ------------------------------
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
      bodyDeviceType ??
      (fcm_token ? getDeviceType(userAgent) : null);

    // ------------------------------
    // 🔹 NORMALIZE ROLE-BASED IDS
    // ------------------------------
    let stateId: number | null = null;
    let districtId: number | null = null;
    let agencyId: number | null = null;

    if (role_type === "STATE") stateId = Number(state_id);
    if (role_type === "DISTRICT") districtId = Number(district_id);
    if (role_type === "AGENCY") agencyId = Number(agency_id);

    // ------------------------------
    // 🔹 CREATE USER
    // ------------------------------
    const newUser = await prisma.user_account.create({
      data: {
        login_id,
        password_hash,
        mobile_number,
        role_type,

        state_id: stateId,
        district_id: districtId,
        agency_id: agencyId,

        // 🔔 Push fields
        FCM_token: fcm_token ?? null,
        deviceType: deviceType,
        firebaseUserKey: "", // Add required firebaseUserKey field
      },
    });

    // 1️⃣ Create user

// 2️⃣ Create Firebase key
const firebaseUserKey = await createFirebaseUserKey(
  newUser.id.toString(),
  newUser.login_id
);

// 3️⃣ Save Firebase key
await prisma.user_account.update({
  where: { id: newUser.id },
  data: { firebaseUserKey },
});


    // ------------------------------
    // 🔔 SEND WELCOME PUSH
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
