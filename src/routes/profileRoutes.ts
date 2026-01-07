


import { getProfile, updatePassword, updateUserAccount } from '##/controllers/profileControllers.js'
import { verifyToken } from '##/middlewares/verifyToken.js'
import express from 'express'

const router = express.Router()


router.route('/get').get(verifyToken,getProfile) // To be implemented
router.route('/update').put(verifyToken,updateUserAccount) // To be implemented
router.route('/update/password').put(verifyToken,updatePassword) // To be implemented

export default router
