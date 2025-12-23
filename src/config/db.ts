import { Prisma, PrismaClient } from '@prisma/client'
import chalk from 'chalk'

const log: Prisma.LogLevel[] = ['error', 'info', 'warn']
if (process.env.NODE_ENV === 'production') {
  log.splice(0, 1)
}
export const prisma = new PrismaClient({
  log,
})
// .$extends({
//   query: {
//     item: {
//       $allOperations({ args, query }) {
//         args = { ...args, include: { details: true } }
//         return query(args)
//       },
//     },
//   },
//   result: {
//     item: {
//       Price: {
//         // @ts-expect-error -not error prisma issue.
//         needs: { details: true },
//         compute(item) {
//           return item.details?.Price
//         },
//       },
//     },
//   },
// })

export async function connectDb() {
  /**
   * In most cases, you do not need to explicitly call these methods.
   * PrismaClient automatically connects when you run your first query, -
   * creates a connection pool, and disconnects when the Node.js process ends.
   */

  try {
    await prisma.$connect()
    console.log(chalk.green('db connected'))
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}
