import express from 'express'
import { errorHandler, notFoundErr } from './middlewares/errorMiddleware.js'
import cors from 'cors'
import v1Routes from './routes/v1.js'
import swaggerUi from 'swagger-ui-express'
import "dotenv/config";
import "./config/firebase.js";

import { createRequire } from 'module'
import { NODE_ENV } from './config/env.js'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { corsOptions } from './config/index.js'
import logger from 'morgan'
// import admin from "./config/firebase.js";

// ✅ Fix BigInt JSON serialization
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

const app = express()

let swaggerDocument

//swagger doc only load in development
if (NODE_ENV !== 'production') {
  const require = createRequire(import.meta.url)
  try {
    swaggerDocument = require('../swagger-output.json')
  } catch (error) {
    console.log(
      'swagger-output.json not found . run `npm run swagger` for api documentation'
    )
  }
}

// console.log("Firebase Apps:", admin.apps.map(app => app));

//helmet middleware
app.use(helmet())
//regular middlewares
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cookieParser())
app.use(logger('dev'))
app.use(cors(corsOptions))
app.get("/", (req, res) => {
  res.send("Firebase Admin Connected ✅");
});
//routes
app.use('/ping', (req, res) => res.json('pong'))
app.use('/api/v1', v1Routes)

//docs
if (NODE_ENV !== 'production') {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))
}

//error middlewares
app.use(notFoundErr)
app.use(errorHandler)

export default app
