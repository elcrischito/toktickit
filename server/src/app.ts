import express, { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { getPrisma } from "./prisma.js";

export const app = express();
app.use(cors());
app.use(express.json());

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(categories);
  } catch {
    res.status(500).json({ error: "Unable to load categories" });
  }
});

// ---------------------------------------------------------------------------
app.get("/api/dev-requesters", async (_req: Request, res: Response) => {
  try {
    const devRequesters = await getPrisma().devRequester.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    });
    res.status(200).json(devRequesters);
  } catch {
    res.status(500).json({ error: "Unable to load development requesters" });
  }
});

// ---------------------------------------------------------------------------
app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const relatedSystems = await getPrisma().relatedSystem.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(relatedSystems);
  } catch {
    res.status(500).json({ error: "Unable to load related systems" });
  }
});

// ---------------------------------------------------------------------------
// Issue 8 — Ticket creation (Lab 2)
async function generateTicketNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await getPrisma().ticket.count();
  const sequence = String(count + 1).padStart(6, "0");
  return `TKT-${year}-${sequence}`;
}

const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

app.post("/api/tickets", async (req: Request, res: Response) => {
  const requesterId = Number(req.header("x-requester-id"));
  const { categoryId, relatedSystemId, summary, description, requestedPriority } = req.body ?? {};

  if (!requesterId || Number.isNaN(requesterId)) {
    return res.status(400).json({
      error: { code: "INVALID_REQUESTER", message: "A valid requester context is required." },
    });
  }

  try {
    const requester = await getPrisma().devRequester.findUnique({ where: { id: requesterId } });
    if (!requester || !requester.isActive) {
      return res.status(400).json({
        error: { code: "INVALID_REQUESTER", message: "Requester is invalid or inactive." },
      });
    }

    const fields: Record<string, string> = {};
    const trimmedSummary = typeof summary === "string" ? summary.trim() : "";
    const trimmedDescription = typeof description === "string" ? description.trim() : "";

    if (trimmedSummary.length < 5 || trimmedSummary.length > 120) {
      fields.summary = "Summary must be between 5 and 120 characters.";
    }
    if (trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
      fields.description = "Description must be between 10 and 2000 characters.";
    }
    if (!VALID_PRIORITIES.includes(requestedPriority)) {
      fields.requestedPriority = "Requested priority must be LOW, MEDIUM, or HIGH.";
    }

    const category = categoryId
      ? await getPrisma().category.findUnique({ where: { id: Number(categoryId) } })
      : null;
    if (!category || !category.isActive) {
      fields.categoryId = "Category is required and must be active.";
    }

    const relatedSystem = relatedSystemId
      ? await getPrisma().relatedSystem.findUnique({ where: { id: Number(relatedSystemId) } })
      : null;
    if (!relatedSystem || !relatedSystem.isActive) {
      fields.relatedSystemId = "Related System is required and must be active.";
    }

    if (Object.keys(fields).length > 0) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "One or more fields are invalid.", fields },
      });
    }

    const ticketNumber = await generateTicketNumber();

    const ticket = await getPrisma().ticket.create({
      data: {
        ticketNumber,
        requesterId,
        categoryId: Number(categoryId),
        relatedSystemId: Number(relatedSystemId),
        summary: trimmedSummary,
        description: trimmedDescription,
        requestedPriority,
      },
    });

    res.status(201).json(ticket);
  } catch {
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Unable to create ticket." } });
  }
});

// ---------------------------------------------------------------------------
// Issue 9 — My Tickets: paginated, searchable, filterable, sortable list
const SORTABLE_FIELDS = ["createdAt", "ticketNumber", "updatedAt"] as const;
const PAGE_SIZES = [10, 25, 50];

app.get("/api/tickets", async (req: Request, res: Response) => {
  const requesterId = Number(req.header("x-requester-id"));
  if (!requesterId || Number.isNaN(requesterId)) {
    return res.status(400).json({
      error: { code: "INVALID_REQUESTER", message: "A valid requester context is required." },
    });
  }

  try {
    const { search, categoryId, requestedPriority, itPriority, currentStatus } = req.query;

    let sortBy = String(req.query.sortBy ?? "createdAt");
    if (!SORTABLE_FIELDS.includes(sortBy as any)) sortBy = "createdAt";

    let sortOrder = String(req.query.sortOrder ?? "desc");
    if (sortOrder !== "asc" && sortOrder !== "desc") sortOrder = "desc";

    let page = parseInt(String(req.query.page ?? "1"), 10);
    if (!Number.isInteger(page) || page < 1) page = 1;

    let pageSize = parseInt(String(req.query.pageSize ?? "10"), 10);
    if (!PAGE_SIZES.includes(pageSize)) pageSize = 10;

    const where: any = { requesterId };
    if (search) {
      where.OR = [
        { ticketNumber: { contains: String(search), mode: "insensitive" } },
        { summary: { contains: String(search), mode: "insensitive" } },
      ];
    }
    if (categoryId) where.categoryId = Number(categoryId);
    if (requestedPriority) where.requestedPriority = String(requestedPriority);
    if (itPriority) where.itPriority = String(itPriority);
    if (currentStatus) where.currentStatus = String(currentStatus);

    const [tickets, totalItems] = await Promise.all([
      getPrisma().ticket.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { category: { select: { name: true } } },
      }),
      getPrisma().ticket.count({ where }),
    ]);

    const data = tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      summary: t.summary,
      categoryId: t.categoryId,
      categoryName: t.category.name,
      requestedPriority: t.requestedPriority,
      itPriority: t.itPriority,
      currentStatus: t.currentStatus,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    res.status(200).json({
      data,
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      },
    });
  } catch {
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Unable to load tickets." } });
  }
});

// ---------------------------------------------------------------------------
// Issue 6 — Requester Ticket Detail + Attachment lifecycle

app.get("/api/tickets/:id", async (req: Request, res: Response) => {
  const requesterId = Number(req.header("x-requester-id"));
  if (!requesterId || Number.isNaN(requesterId)) {
    return res.status(400).json({
      error: { code: "INVALID_REQUESTER", message: "A valid requester context is required." },
    });
  }
  const ticketId = Number(req.params.id);
  if (!ticketId || Number.isNaN(ticketId)) {
    return res.status(400).json({
      error: { code: "INVALID_TICKET_ID", message: "Invalid ticket id." },
    });
  }

  try {
    const ticket = await getPrisma().ticket.findUnique({
      where: { id: ticketId },
      include: {
        category: { select: { name: true } },
        relatedSystem: { select: { name: true } },
        requester: { select: { name: true } },
        attachments: { where: { isRemoved: false }, orderBy: { createdAt: "desc" } },
      },
    });

    if (!ticket || ticket.requesterId !== requesterId) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found." } });
    }

    res.status(200).json({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      summary: ticket.summary,
      description: ticket.description,
      categoryName: ticket.category.name,
      relatedSystemName: ticket.relatedSystem.name,
      requesterName: ticket.requester.name,
      requestedPriority: ticket.requestedPriority,
      itPriority: ticket.itPriority,
      currentStatus: ticket.currentStatus,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      attachments: ticket.attachments.map((a) => ({
        id: a.id,
        originalName: a.originalName,
        mimeType: a.mimeType,
        size: a.size,
        createdAt: a.createdAt,
      })),
    });
  } catch {
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Unable to load ticket." } });
  }
});

app.post(
  "/api/tickets/:id/attachments",
  upload.single("file"),
  async (req: Request, res: Response) => {
    const requesterId = Number(req.header("x-requester-id"));
    if (!requesterId || Number.isNaN(requesterId)) {
      return res.status(400).json({
        error: { code: "INVALID_REQUESTER", message: "A valid requester context is required." },
      });
    }
    const ticketId = Number(req.params.id);
    if (!req.file) {
      return res.status(400).json({ error: { code: "NO_FILE", message: "No file was uploaded." } });
    }

    try {
      const ticket = await getPrisma().ticket.findUnique({ where: { id: ticketId } });
      if (!ticket || ticket.requesterId !== requesterId) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found." } });
      }

      const attachment = await getPrisma().attachment.create({
        data: {
          ticketId,
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
        },
      });

      res.status(201).json({
        id: attachment.id,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        size: attachment.size,
        createdAt: attachment.createdAt,
      });
    } catch {
      res.status(500).json({ error: { code: "SERVER_ERROR", message: "Unable to upload attachment." } });
    }
  }
);

app.get("/api/tickets/:id/attachments/:attachmentId", async (req: Request, res: Response) => {
  const requesterId = Number(req.header("x-requester-id"));
  if (!requesterId || Number.isNaN(requesterId)) {
    return res.status(400).json({
      error: { code: "INVALID_REQUESTER", message: "A valid requester context is required." },
    });
  }
  const ticketId = Number(req.params.id);
  const attachmentId = Number(req.params.attachmentId);

  try {
    const attachment = await getPrisma().attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment || attachment.ticketId !== ticketId || attachment.isRemoved) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Attachment not found." } });
    }

    const ticket = await getPrisma().ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.requesterId !== requesterId) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Attachment not found." } });
    }

    const filePath = path.join(UPLOAD_DIR, attachment.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: { code: "FILE_MISSING", message: "File no longer exists on disk." } });
    }

    res.download(filePath, attachment.originalName);
  } catch {
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Unable to download attachment." } });
  }
});

app.delete("/api/tickets/:id/attachments/:attachmentId", async (req: Request, res: Response) => {
  const requesterId = Number(req.header("x-requester-id"));
  if (!requesterId || Number.isNaN(requesterId)) {
    return res.status(400).json({
      error: { code: "INVALID_REQUESTER", message: "A valid requester context is required." },
    });
  }
  const ticketId = Number(req.params.id);
  const attachmentId = Number(req.params.attachmentId);

  try {
    const attachment = await getPrisma().attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment || attachment.ticketId !== ticketId) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Attachment not found." } });
    }

    const ticket = await getPrisma().ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.requesterId !== requesterId) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Attachment not found." } });
    }

    await getPrisma().attachment.update({ where: { id: attachmentId }, data: { isRemoved: true } });
    res.status(200).json({ id: attachmentId, isRemoved: true });
  } catch {
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Unable to remove attachment." } });
  }
});

// ---------------------------------------------------------------------------

export default app;