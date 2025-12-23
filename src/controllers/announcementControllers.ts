import { Request, Response, NextFunction } from "express";
import { prisma } from "#config/db.js";
import { serialize } from "#utils/serialize.js";

export const createAnnouncement = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      level,
      state_id,
      district_id,
      title,
      message,
      valid_from,
      valid_to,
      
    } = req.body;

     const loggedUser = req.user; // { id, role_type }
    console.log("Logged User:", loggedUser);
    // Required fields
    if (!level || !title || !message || !valid_from ) {
      res.status(400).json({
        message:
          "level, title, message, valid_from, created_by_user are required",
      });
      return;
    }

    // State-level validation
    if (level === "STATE" && !state_id) {
      res.status(400).json({ message: "state_id is required for STATE level announcement" });
      return;
    }

    // District-level validation
    if (level === "DISTRICT" && !district_id) {
      res.status(400).json({ message: "district_id is required for DISTRICT level announcement" });
      return;
    }

    const announcement = await prisma.announcement.create({
      data: {
        level,
        state_id: state_id ? BigInt(state_id) : null,
        district_id: district_id ? BigInt(district_id) : null,
        title,
        message,
        valid_from: new Date(valid_from),
        valid_to: valid_to ? new Date(valid_to) : null,
        created_by_user: Number(loggedUser?.id),
      },
    });

    res.status(201).json({
      message: "Announcement created successfully",
      data: serialize(announcement),
    });
  } catch (error) {
    console.error("Error creating announcement:", error);
    next(error);
  }
};


export const getAllAnnouncements = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { id: "desc" },
      include: {
        state_committee: true,
        district_committee: true,
        user_account: true,
      },
    });

    res.status(200).json({
      message: "Announcements fetched successfully",
      data: serialize(announcements),
    });
  } catch (error) {
    console.error("Error fetching announcements:", error);
    next(error);
  }
};


export const getAnnouncementById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const announcement = await prisma.announcement.findUnique({
      where: { id: BigInt(id) },
      include: {
        state_committee: true,
        district_committee: true,
        user_account: true,
      },
    });

    if (!announcement) {
      res.status(404).json({ message: "Announcement not found" });
      return;
    }

    res.status(200).json({
      message: "Announcement fetched successfully",
      data: serialize(announcement),
    });
  } catch (error) {
    console.error("Error fetching announcement:", error);
    next(error);
  }
};

export const updateAnnouncement = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const {
      level,
      state_id,
      district_id,
      title,
      message,
      valid_from,
      valid_to,
    } = req.body;

    const loggedUser = req.user; // { id, role_type }

    if (!id) {
      res.status(400).json({ message: "Announcement id is required" });
      return;
    }

    // Check announcement exists
    const existingAnnouncement = await prisma.announcement.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existingAnnouncement) {
      res.status(404).json({ message: "Announcement not found" });
      return;
    }

    // State-level validation
    if (level === "STATE" && !state_id) {
      res.status(400).json({
        message: "state_id is required for STATE level announcement",
      });
      return;
    }

    // District-level validation
    if (level === "DISTRICT" && !district_id) {
      res.status(400).json({
        message: "district_id is required for DISTRICT level announcement",
      });
      return;
    }

    const updatedAnnouncement = await prisma.announcement.update({
      where: { id: BigInt(id) },
      data: {
        level: level ?? undefined,
        state_id: state_id ? BigInt(state_id) : undefined,
        district_id: district_id ? BigInt(district_id) : undefined,
        title,
        message,
        valid_from: valid_from ? new Date(valid_from) : undefined,
        valid_to: valid_to ? new Date(valid_to) : undefined,
        // optional audit field if exists in schema
        updated_by_user: loggedUser?.id ? Number(loggedUser.id) : undefined,
      },
    });

    res.status(200).json({
      message: "Announcement updated successfully",
      data: serialize(updatedAnnouncement),
    });
  } catch (error) {
    console.error("Error updating announcement:", error);
    next(error);
  }
};
