import createError from 'http-errors'
import { NextFunction, Request, Response } from 'express'
import { decodeToken } from '#services/authServices.js'
import { COOKIE_NAME, redisLog } from '#config/index.js'

declare global {
  namespace Express {
    interface Request {
      user?: any
    }
  }
}

export const verifyToken = async (
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

  

    req.user = decodeToken(token)
    next()
  } catch (error) {
    next(error)
  }
}
