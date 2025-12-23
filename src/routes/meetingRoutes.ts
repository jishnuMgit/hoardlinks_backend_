import { createMeeting, getAllMeetings, getMeetingById, updateMeeting } from '##/controllers/meetingControllers.js'
import { verifyToken } from '##/middlewares/verifyToken.js'
import express from 'express'

const router = express.Router()


router.route('/create').post(verifyToken,  createMeeting)
router.route('/getAll').get(getAllMeetings) // To be implemented
router.route('/get/:id').get(getMeetingById) // To be implemented
router.route("/update/:id").put(updateMeeting);

export default router
