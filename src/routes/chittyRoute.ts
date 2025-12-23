import express from 'express'
import { verifyToken } from '##/middlewares/verifyToken.js'
import { getChitty, getChittyByid } from '##/controllers/chittyController.js'

const router = express.Router()


router.route('/getAllChitty').get(verifyToken,getChitty)
router.route('/getChitty/:id').get(verifyToken,getChittyByid) 

export default router
