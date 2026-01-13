import createError from "http-errors";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      resetUser?: {
        userId: bigint;
      };
    }
  }
}

export const verifyResetToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token =
      req.headers["x-reset-token"] || req.body.resetToken;

    if (!token) {
      throw createError(401, "Reset token required");
    }

    const decoded = jwt.verify(
      token as string,
      process.env.RESET_SECRET!
    ) as { userId: bigint };

    req.resetUser = decoded;
    next();
  } catch (error) {
    next(createError(401, "Invalid or expired reset token"));
  }
};
