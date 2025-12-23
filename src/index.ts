import { createServer } from 'http'
import app from './app.js'
import { connectDb } from './config/db.js'

const server = createServer(app)
const PORT = process.env.PORT || 3000

async function main() {
  await connectDb()
 
// sendInvoiceMessage('91','7736724727','jishnu','gygdjn')
  server.listen(PORT, () => console.log(`listening in ${PORT}`))
}

main()
