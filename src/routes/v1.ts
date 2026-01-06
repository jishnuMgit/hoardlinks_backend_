import express from 'express'
import authRoutes from './authRoutes.js'
import stateRoutes from './stateRoutes.js'
import  districtRoutes  from './districtRoutes.js'
import agencyRoutes from './agencyRoutes.js'
import meetingRoutes from './meetingRoutes.js'
import announcement from './announcementRoutes.js'
import profileRoutes from './profileRoutes.js'
import tokenRoutess from './tokenRoutes.js'
import chittyRoutes from './chittyRoute.js'
import uploadChittyPaymentImageController   from './uploadChittyPaymentImageRoutes.js'

const router = express.Router()

// API /api/v1
router
  .use(
    '/auth',
    /* #swagger.tags = ['Auth routes']
    #swagger.responses[500] */
    authRoutes
  ).use(
    '/state',
    /* #swagger.tags = ['State routes']
    #swagger.responses[500] */
    stateRoutes
  ).use(
    '/district',
    /* #swagger.tags = ['District routes']
    #swagger.responses[500] */
    districtRoutes
  ).use(
    '/agency',
    /* #swagger.tags = ['Agency routes']
    #swagger.responses[500] */
    agencyRoutes
  ).use(
    '/meeting',
    /* #swagger.tags = ['Meeting routes']
    #swagger.responses[500] */
    meetingRoutes
  ).use(
    '/announcement',
    /* #swagger.tags = ['Announcement routes']
    #swagger.responses[500] */
    announcement
  ).use('/profile',profileRoutes

  ).use('/token',tokenRoutess

  ).use('/chitty',chittyRoutes
  ).use( '/img',uploadChittyPaymentImageController)
  
export default router
