import { createAnnouncement, getAllAnnouncements, getAnnouncementById, updateAnnouncement } from '##/controllers/announcementControllers.js'
import { verifyToken } from '##/middlewares/verifyToken.js'
import express from 'express'

const router = express.Router()


router.route('/create').post(verifyToken,  createAnnouncement)
router.route('/getAll').get(getAllAnnouncements) // To be implemented
router.route('/get/:id').get(getAnnouncementById) // To be implemented
router.route("/update/:id").put(updateAnnouncement);

export default router
