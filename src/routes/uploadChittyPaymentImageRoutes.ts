import express from "express";
import { verifyToken } from "##/middlewares/verifyToken.js";
import { uploadChittyPaymentImage } from "##/middlewares/uploadChittyPayment.js";
import { uploadChittyPaymentImageController } from "##/controllers/uploadChittyPaymentImageController.js";


const router = express.Router();

router.post(
  "/chitty/payment/upload",
  verifyToken,
  uploadChittyPaymentImage.single("image"),
  uploadChittyPaymentImageController
);

export default router;
  