import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "##/prisma.js";

export const uploadUserImageController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
const user = req.user;

    // -----------------------------
    // 🔹 Auth check
    // -----------------------------
    if (!user?.id) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // -----------------------------
    // 🔹 Fetch logged-in user
    // -----------------------------
    const currentUser = await prisma.user_account.findUnique({
      where: { id: BigInt(user.id) },
    });
    // -----------------------------
    // 🔹 Validation
    // -----------------------------
    if (!currentUser ) {
      res.status(400).json({
        success: false,
        message: "Valid user is required",
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
    )}/uploads/user/${req.file.filename}`;
 
    // -----------------------------
    // 🔹 Update DB
    // -----------------------------
    const updatedPayment = await prisma.user_account.update({
      where: {
        id: BigInt(currentUser.id),
      },
      data: {
        img_url: imageUrl,
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
