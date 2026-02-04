import createError from 'http-errors'
import { NextFunction, Request, Response } from 'express'
import { decodeToken } from '../services/authServices.js'
import { COOKIE_NAME, redisLog } from '../config/index.js'
import { log } from 'console'

declare global {
  namespace Express {
    interface Request {
      user?: any
    }
  }
}

export const CheckToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token: string =
      req.headers?.[COOKIE_NAME] || req.cookies?.[COOKIE_NAME]
    if (!token) {
      throw createError(401, 'not authorized')
    }

  console.log("hbsfffffffff");
  

    req.user = decodeToken(token)

    res.status(200).json({ valid: true, user: req.user });

} catch (error) {
    next(error)
  }
}
