import chalk from "chalk";
import { CorsOptions } from "cors";
import { CookieOptions } from "express";
import { NODE_ENV, CORS_ORIGINS } from "./env.js";

/**
 * 24 Hours
 */
const TTL_COOKIE = 24 * 3600 * 1000;

export const COOKIE_NAME = "access_token";

export const COOKIE_OPTIONS: CookieOptions = {
  maxAge: TTL_COOKIE,
  httpOnly: true,
  sameSite: "none",
  secure: true,
};

// Convert CSV string to array, ignore empty values
const whiteList: string[] = (CORS_ORIGINS || "")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

export const redisLog = {
  WARN: chalk.yellow("warn:", "Redis not connected !!!"),
  BLACK_LIST_ERR: chalk.bgRed(
    "redis not connected - Token blacklisting not working...!!!"
  ),
  CONNECTED: chalk.green("redis connected"),
};

export const corsOptions: CorsOptions = {
  origin: function (origin, cb) {
    console.log(chalk.yellowBright("CORS Request From:", origin));

    // Allow everything in development
    if (NODE_ENV !== "production") return cb(null, true);

    // Check whitelist
    if (whiteList.includes(origin!) || !origin) {
      return cb(null, true);
    }

    cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
};
