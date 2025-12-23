


import { getProfile } from '##/controllers/profileControllers.js'
import { verifyToken } from '##/middlewares/verifyToken.js'
import express from 'express'

const router = express.Router()


router.route('/get').get(verifyToken,getProfile) // To be implemented

export default router
