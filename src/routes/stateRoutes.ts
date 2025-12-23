import express from 'express'
import { createState, getStateById, getStates, updateState } from '##/controllers/stateController.js'

const router = express.Router()


router.route('/create').post(createState)
router.route('/getAll').get(getStates)
router.route('/get/:id').get(getStateById)
router.route("/update/:id").put(updateState);


export default router
