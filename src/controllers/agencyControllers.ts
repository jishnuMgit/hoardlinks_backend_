import { Request, Response, NextFunction } from "express";
import { prisma } from "#config/db.js";
import createError from "http-errors";
import { serialize } from "#utils/serialize.js";

export const createAgency = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      district_id,
      agency_code,
      legal_name,
      trade_name,
      contact_person,
      contact_phone,
      contact_email,
      address_line1,
      address_line2,
      city,
      pincode,
      gst_number,
    } = req.body;

    if (
      !district_id ||
      !agency_code ||
      !legal_name ||
      !contact_person ||
      !contact_phone
    ) {
      res.status(400).json({
        message:
          "district_id, agency_code, legal_name, contact_person, contact_phone are required",
      });
      return;
    }

    // Check district exists
    const district = await prisma.district_committee.findUnique({
      where: { id: Number(district_id) },
    });

    if (!district) {
      res.status(404).json({ message: "District not found" });
      return;
    }

    const existingAgency = await prisma.agency_member.findUnique({
      where: { agency_code },
    });
    if (existingAgency) {
      res.status(409).json({ message: "Agency with this code already exists" });
      return;
    }

    const agency = await prisma.agency_member.create({
      data: {
        district_id: Number(district_id),
        agency_code,
        legal_name,
        trade_name,
        contact_person,
        contact_phone,
        contact_email,
        address_line1,
        address_line2,
        city,
        pincode,
        gst_number,
        membership_status: "PENDING",
      },
    });

    res.status(201).json({
      message: "Agency created successfully",
      agency,
    });
  } catch (error) {
    console.error("Error creating agency:", error);
    next(createError(500, "Internal Server Error"));
  }
};




export const getAllAgencies = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const agencies = await prisma.agency_member.findMany({
      orderBy: { id: "desc" },
    });

    res.status(200).json({
      message: "Agencies fetched successfully",
      data: serialize(agencies),
    });
  } catch (error) {
    console.error("Error fetching agencies:", error);
    next(error);
  }
};



export const GetagencymemberbyId = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const state = await prisma.agency_member.findUnique({
      where: { id: Number(id) }
    });

    if (!state) {
      res.status(404).json({ message: "State not found" });
      return;
    }

    res.status(200).json({
      message: "State fetched successfully",
      data: serialize(state),
    });
  } catch (error) {
    console.error("Error fetching state by ID:", error);
    next(error);
  }
};


export const updateAgency = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const {
      district_id,
      agency_code,
      legal_name,
      trade_name,
      contact_person,
      contact_phone,
      contact_email,
      address_line1,
      address_line2,
      city,
      pincode,
      gst_number,
      membership_status,
    } = req.body;

    if (!id) {
      res.status(400).json({ message: "Agency id is required" });
      return;
    }

    // Check agency exists
    const existingAgency = await prisma.agency_member.findUnique({
      where: { id: Number(id) },
    });

    if (!existingAgency) {
      res.status(404).json({ message: "Agency not found" });
      return;
    }

    // If district_id is provided, validate district exists
    if (district_id) {
      const district = await prisma.district_committee.findUnique({
        where: { id: Number(district_id) },
      });

      if (!district) {
        res.status(404).json({ message: "District not found" });
        return;
      }
    }

    // If agency_code is changing, check uniqueness
    if (agency_code && agency_code !== existingAgency.agency_code) {
      const codeExists = await prisma.agency_member.findUnique({
        where: { agency_code },
      });

      if (codeExists) {
        res.status(409).json({
          message: "Agency with this code already exists",
        });
        return;
      }
    }

    const updatedAgency = await prisma.agency_member.update({
      where: { id: Number(id) },
      data: {
        district_id: district_id ? Number(district_id) : undefined,
        agency_code,
        legal_name,
        trade_name,
        contact_person,
        contact_phone,
        contact_email,
        address_line1,
        address_line2,
        city,
        pincode,
        gst_number,
        membership_status,
      },
    });

    res.status(200).json({
      message: "Agency updated successfully",
      data: serialize(updatedAgency),
    });
  } catch (error) {
    console.error("Error updating agency:", error);
    next(createError(500, "Internal Server Error"));
  }
};


export const getAgenciesUnderState = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { state_id } = req.params;
    const { q, page = "1", limit = "20" } = req.query;

    // -----------------------------
    // 🔹 Pagination
    // -----------------------------
    const pageNumber = Math.max(Number(page), 1);
    const pageSize = Math.min(Number(limit), 100);
    const skip = (pageNumber - 1) * pageSize;

    // -----------------------------
    // 🔹 WHERE condition (SAFE)
    // -----------------------------
    const whereCondition: any = {
      AND: [
        {
          district_committee: {
            state_id: BigInt(state_id),
          },
        },
      ],
    };

    // 🔸 Search (NO mode)
    if (q && typeof q === "string") {
      whereCondition.AND.push({
        OR: [
          { agency_code: { contains: q } },
          { legal_name: { contains: q } },
          { trade_name: { contains: q } },
          { contact_person: { contains: q } },
          { contact_phone: { contains: q } },
        ],
      });
    }

    // -----------------------------
    // 🔹 DB Query
    // -----------------------------
    const [total, agencies] = await Promise.all([
      prisma.agency_member.count({ where: whereCondition }),

      prisma.agency_member.findMany({
        where: whereCondition,
        skip,
        take: pageSize,
        orderBy: { legal_name: "asc" },
        select: {
          id: true,
          agency_code: true,
          legal_name: true,
          trade_name: true,
          contact_person: true,
          contact_phone: true,
          contact_email: true,
          membership_status: true,
          district_id: true,
          district_committee: {
            select: {
              district_name: true,
             

            },
          },
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      meta: {
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      data: agencies,
    });
  } catch (error) {
    console.error("getAgenciesUnderState error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch agencies under state",
    });
  }
};



export const getAgenciesUnderDistrict = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { state_id, district_id } = req.params;
    const { legal_name, trade_name, page = "1", limit = "20" } = req.query;

    if (!state_id || !district_id) {
      res.status(400).json({
        success: false,
        message: "state_id and district_id are required",
      });
      return;
    }

    console.log(legal_name, trade_name);
    

    // -----------------------------
    // 🔹 Pagination
    // -----------------------------
    const pageNumber = Math.max(Number(page), 1);
    const pageSize = Math.min(Number(limit), 100);
    const skip = (pageNumber - 1) * pageSize;

    // -----------------------------
    // 🔹 Base WHERE condition
    // -----------------------------
    const whereCondition: any = {
      AND: [
        { district_id: BigInt(district_id) },
        {
          district_committee: {
            state_id: BigInt(state_id),
          },
        },
      ],
    };

    // -----------------------------
    // 🔹 SEARCH LOGIC (YOUR REQUIREMENT)
    // -----------------------------
   if (
  (legal_name && typeof legal_name === "string") ||
  (trade_name && typeof trade_name === "string")
) {
  whereCondition.AND.push({
    OR: [
      ...(legal_name && typeof legal_name === "string"
        ? [
            {
              legal_name: {
                contains: legal_name,
              },
            },
            {
              trade_name: {
                contains: legal_name,
              },
            },
          ]
        : []),

      ...(trade_name && typeof trade_name === "string"
        ? [
            {
              trade_name: {
                contains: trade_name,
              },
            },
          ]
        : []),
    ],
  });
}


    // -----------------------------
    // 🔹 DB Query
    // -----------------------------
    const [total, agencies] = await Promise.all([
      prisma.agency_member.count({ where: whereCondition }),

      prisma.agency_member.findMany({
        where: whereCondition,
        skip,
        take: pageSize,
        orderBy: { legal_name: "asc" },
        select: {
          id: true,
          agency_code: true,
          legal_name: true,
          trade_name: true,
          contact_person: true,
          contact_phone: true,
          contact_email: true,
          membership_status: true,
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      meta: {
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      data: agencies,
    });
  } catch (error) {
    console.error("getAgenciesUnderDistrict error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch agencies under district",
    });
  }
};




