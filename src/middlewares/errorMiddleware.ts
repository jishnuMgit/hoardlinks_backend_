import createError from 'http-errors'
import { ErrorResponse } from '#models/responseModel.js'
import { NextFunction, Request, Response } from 'express'
import chalk from 'chalk'

export const notFoundErr = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  next(createError(404, 'Not found'))
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  function isJsonParsable(data: string) {
    try {
      return JSON.parse(data)
    } catch {
      return null
    }
  }
  if (process.env.NODE_ENV !== 'production') {
    console.log(chalk.red(err.stack))
  } else {
    console.log(chalk.red(err.message))
  }
  // zod custom error is array of object
  const errData = isJsonParsable(err.message) ?? {}
  const errMessage = !isJsonParsable(err.message)
    ? err.message
    : typeof errData[0].message === 'string'
      ? errData[0].message
      : 'something went wrong'
  const error = new ErrorResponse(errMessage, err.status, errData)
  res.status(error.status).json(error)
}
