import express from 'express'
import { createAgency,  getAgenciesUnderDistrict,  getAgenciesUnderState,  GetagencymemberbyId,  getAllAgencies, updateAgency } from '../controllers/agencyControllers.js'
import { verifyToken } from '../middlewares/verifyToken.js'

const router = express.Router()


router.route('/create').post(createAgency)
router.route('/getAll').get(getAllAgencies) // To be implemented
router.route('/get/:id').get(GetagencymemberbyId) // To be implemented
router.route("/update/:id").put(updateAgency);
router.route("/agencies/state/:state_id").get(verifyToken , getAgenciesUnderState);
router.route("/agencies/state/:state_id/district/:district_id").get(verifyToken , getAgenciesUnderDistrict);


export default router
