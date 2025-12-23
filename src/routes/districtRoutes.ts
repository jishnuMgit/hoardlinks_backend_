import express from 'express'
import { createDistrict, getAllDistricts, getDistrictsById, updateDistrict } from '##/controllers/districtControllers.js'

const router = express.Router()


router.route('/create').post(createDistrict)
router.route('/getAll').get(getAllDistricts)
router.route('/get/:id').get(getDistrictsById)
router.route('/update/:id').put(updateDistrict) // TODO: add update controller


export default router
