import { CheckToken } from '##/controllers/tokenValidController.js'
import express from 'express'

const router = express.Router()

router.route('/verify').get(CheckToken)

export default router
