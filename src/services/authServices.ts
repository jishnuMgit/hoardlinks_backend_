import bcrypt from 'bcrypt'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import { JWT_SECRET } from '#config/env.js'

export interface TokenPayload extends JwtPayload {
  id: string | number
  role: string
}

export const matchPassword = async (password: string, hash: string) => {
  if (hash.slice(0, 4) === '$2y$') {
    hash = hash.replace(hash.slice(0, 4), '$2b$')
  }

  return await bcrypt.compare(password, hash)
}

export const decodeToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload
}
