export const {
  JWT_SECRET,
  NODE_ENV,
  REDIS_HOST,
  REDIS_PORT,
  REDIS_USERNAME,
  REDIS_PASSWORD,
  CORS_ORIGINS,
} = process.env as { [x: string]: string }
