import express from 'express'
import { createAgency,  GetagencymemberbyId,  getAllAgencies, updateAgency } from '##/controllers/agencyControllers.js'

const router = express.Router()


router.route('/create').post(createAgency)
router.route('/getAll').get(getAllAgencies) // To be implemented
router.route('/get/:id').get(GetagencymemberbyId) // To be implemented
router.route("/update/:id").put(updateAgency);


export default router
