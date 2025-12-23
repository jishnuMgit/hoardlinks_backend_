import { Request, Response, NextFunction } from "express";
import { prisma } from "#config/db.js";
import { serialize } from "#utils/serialize.js";

export const createMeeting = async (
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
      description,
      meeting_datetime,
      venue
    } = req.body;


     const loggedUser = req.user; // { id, role_type }
    console.log("Logged User:", loggedUser);

    // Basic Validation
    if (!level || !title || !meeting_datetime) {
      res.status(400).json({
        message: "level, title, meeting_datetime, created_by_user are required"
      });
      return;
    }

    // Validate correct role logic
    if (level === "STATE" && !state_id) {
      res.status(400).json({ message: "state_id is required for STATE level meeting." });
      return;
    }

    if (level === "DISTRICT" && !district_id) {
      res.status(400).json({ message: "district_id is required for DISTRICT level meeting." });
      return;
    }

    const meeting = await prisma.meeting_schedule.create({
      data: {
        level,
        state_id: state_id ? BigInt(state_id) : null,
        district_id: district_id ? BigInt(district_id) : null,
        title,
        description,
        meeting_datetime: new Date(meeting_datetime),
        venue,
        created_by_user: Number(loggedUser?.id),
      },
    });

    res.status(201).json({
      message: "Meeting created successfully",
      data: serialize(meeting),
    });
  } catch (error) {
    console.error("Error creating meeting:", error);
    next(error);
  }
};


export const getAllMeetings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const meetings = await prisma.meeting_schedule.findMany({
      orderBy: { id: "desc" },
      include: {
        state_committee: true,
        district_committee: true,
        user_account: true,
      },
    });

    res.status(200).json({
      message: "Meetings fetched successfully",
      data: serialize(meetings),
    });
  } catch (error) {
    console.error("Error fetching meetings:", error);
    next(error);
  }
};


export const getMeetingById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const meeting = await prisma.meeting_schedule.findUnique({
      where: { id: BigInt(id) },
      include: {
        state_committee: true,
        district_committee: true,
        user_account: true,
      },
    });

    if (!meeting) {
      res.status(404).json({ message: "Meeting not found" });
      return;
    }

    res.status(200).json({
      message: "Meeting fetched successfully",
      data: serialize(meeting),
    });
  } catch (error) {
    console.error("Error fetching meeting:", error);
    next(error);
  }
};


export const updateMeeting = async (
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
      description,
      meeting_datetime,
      venue
    } = req.body;

    const loggedUser = req.user; // { id, role_type }

    if (!id) {
      res.status(400).json({ message: "Meeting id is required" });
      return;
    }

    // Check meeting exists
    const existingMeeting = await prisma.meeting_schedule.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existingMeeting) {
      res.status(404).json({ message: "Meeting not found" });
      return;
    }

    // Validate role logic if level is provided
    if (level === "STATE" && !state_id) {
      res.status(400).json({
        message: "state_id is required for STATE level meeting."
      });
      return;
    }

    if (level === "DISTRICT" && !district_id) {
      res.status(400).json({
        message: "district_id is required for DISTRICT level meeting."
      });
      return;
    }

    const updatedMeeting = await prisma.meeting_schedule.update({
      where: { id: BigInt(id) },
      data: {
        level: level ?? undefined,
        state_id: state_id ? BigInt(state_id) : undefined,
        district_id: district_id ? BigInt(district_id) : undefined,
        title,
        description,
        meeting_datetime: meeting_datetime
          ? new Date(meeting_datetime)
          : undefined,
        venue,
        // Optional: track who updated
        updated_by_user: loggedUser?.id ? Number(loggedUser.id) : undefined,
      },
    });

    res.status(200).json({
      message: "Meeting updated successfully",
      data: serialize(updatedMeeting),
    });
  } catch (error) {
    console.error("Error updating meeting:", error);
    next(error);
  }
};
