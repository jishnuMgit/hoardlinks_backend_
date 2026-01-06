import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "##/prisma.js";

export const uploadChittyPaymentImageController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { payment_id } = req.body as { payment_id?: string };

    // -----------------------------
    // 🔹 Validation
    // -----------------------------
    if (!payment_id || isNaN(Number(payment_id))) {
      res.status(400).json({
        success: false,
        message: "Valid payment_id is required",
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: "Image file is required",
      });
      return;
    }

    // -----------------------------
    // 🔹 Build Image URL
    // -----------------------------
    const imageUrl = `${req.protocol}://${req.get(
      "host"
    )}/uploads/chitty-payments/${req.file.filename}`;

    // -----------------------------
    // 🔹 Update DB
    // -----------------------------
    const updatedPayment = await prisma.chitty_payment.update({
      where: {
        id: BigInt(payment_id),
      },
      data: {
        url: imageUrl,
      },
    });

    // -----------------------------
    // 🔹 Response
    // -----------------------------
    res.status(200).json({
      success: true,
      message: "Payment image uploaded successfully",
      image_url: imageUrl,
      data: updatedPayment,
    });
  } catch (error: unknown) {
    console.error("uploadChittyPaymentImage error:", error);

    // Prisma-specific error handling
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        res.status(404).json({
          success: false,
          message: "Chitty payment not found",
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Failed to upload payment image",
    });
  }
};
