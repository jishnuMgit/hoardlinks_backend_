/**
 *
 * @class SuccessResponse
 * @constructor
 * @param {string} [message] - success message
 * @param {object|string} data -
 * @param {number} status - http succes status code
 */
export class SuccessResponse {
  message: string
  success: boolean
  error: boolean
  data: object

  constructor(message?: string, data?: any) {
    this.message = message ?? 'Ok'
    this.success = true
    this.data = data ?? {}
    this.error = false
  }
}

/**
 *
 * @class ErrorResponse
 * @constructor
 * @param {string} message - error message
 * @param {number} status - http error status code
 */
export class ErrorResponse {
  message: string
  success: boolean
  error: boolean
  status: number
  data: object

  constructor(message: string, status: number, data = {}) {
    this.message = message ?? 'internal server error'
    this.success = false
    this.error = true
    this.status = status ?? 500
    this.data = data
  }
}
