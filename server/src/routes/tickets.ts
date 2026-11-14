import { Router, Response } from "express";
import { PrismaClient, Priority } from "@prisma/client";
import { authenticate, AuthRequest } from "../middleware/auth";
import { ATTACHMENT_METADATA } from "./attachments";

const router = Router();
const prisma = new PrismaClient();

// GET /api/tickets
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { search, status, priority, categoryId } = req.query;
    const where: any = {};

    // BR-20 (Lab 2): default 10 per page, allowed sizes 10/25/50, invalid values fall back to defaults
    const ALLOWED_PAGE_SIZES = [10, 25, 50];
    const requestedSize = parseInt(String(req.query.pageSize ?? ""), 10);
    const pageSize = ALLOWED_PAGE_SIZES.includes(requestedSize) ? requestedSize : 10;
    const requestedPage = parseInt(String(req.query.page ?? ""), 10);
    const page = Number.isInteger(requestedPage) && requestedPage >= 1 ? requestedPage : 1;

    if (req.user!.role === "REQUESTER") {
      where.requesterId = req.user!.id;
    }

    if (search) {
      where.OR = [
        { ticketNumber: { contains: String(search), mode: "insensitive" } },
        { summary: { contains: String(search), mode: "insensitive" } },
      ];
    }
    if (status) {
      if (status === "OPEN_ALL") {
        where.status = { in: ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"] };
      } else {
        where.status = String(status);
      }
    }
    if (priority) where.requestedPriority = String(priority);
    if (categoryId) where.categoryId = String(categoryId);

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          category: true,
          relatedSystem: true,
          requester: { select: { id: true, fullName: true, email: true } },
          owner: { select: { id: true, fullName: true, email: true } },
          _count: { select: { actionsTaken: true } },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    return res.json({
      tickets,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch {
    return res.status(500).json({ error: "Failed to load tickets" });
  }
});

// POST /api/tickets
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { categoryId, relatedSystemId, summary, description, requestedPriority } = req.body;

    const trimmedSummary = typeof summary === "string" ? summary.trim() : "";
    const trimmedDescription = typeof description === "string" ? description.trim() : "";

    if (trimmedSummary.length < 5 || trimmedSummary.length > 120) {
      return res.status(400).json({ error: "Summary must be between 5 and 120 characters." });
    }
    if (trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
      return res.status(400).json({ error: "Description must be between 10 and 2000 characters." });
    }
    if (!categoryId) {
      return res.status(400).json({ error: "Category is required." });
    }

    const priority: Priority = ["LOW", "MEDIUM", "HIGH"].includes(requestedPriority)
      ? requestedPriority
      : "MEDIUM";

    const year = new Date().getFullYear();
    const randomSuffix = String(Math.floor(100000 + Math.random() * 900000));
    const ticketNumber = `TKT-${year}-${randomSuffix}`;

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        summary: trimmedSummary,
        description: trimmedDescription,
        requestedPriority: priority,
        itPriority: priority,
        categoryId,
        ...(relatedSystemId && { relatedSystemId }),
        requesterId: req.user!.id,
      },
      include: {
        category: true,
        relatedSystem: true,
        requester: { select: { id: true, fullName: true, email: true } },
        owner: { select: { id: true, fullName: true, email: true } },
      },
    });

    return res.status(201).json(ticket);
  } catch {
    return res.status(500).json({ error: "Failed to create ticket" });
  }
});

// GET /api/tickets/:id
router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        relatedSystem: true,
        requester: { select: { id: true, fullName: true, email: true } },
        owner: { select: { id: true, fullName: true, email: true } },
        attachments: { where: { isRemoved: false }, select: ATTACHMENT_METADATA },
      },
    });

    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    if (req.user!.role === "REQUESTER" && ticket.requesterId !== req.user!.id) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    return res.json(ticket);
  } catch {
    return res.status(500).json({ error: "Failed to load ticket details" });
  }
});

// POST /api/tickets/:id/problem-resolved (Action consultative Requester - BR-07)
router.post("/:id/problem-resolved", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket || (req.user!.role === "REQUESTER" && ticket.requesterId !== req.user!.id)) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const noteText = typeof req.body?.note === "string" && req.body.note.trim()
      ? req.body.note.trim()
      : "Problem appears resolved from my side.";

    const comment = await prisma.publicComment.create({
      data: {
        ticketId: ticket.id,
        authorId: req.user!.id,
        content: `[Problem Appears Resolved] ${noteText}`,
      },
      include: { author: { select: { id: true, fullName: true, role: true } } },
    });

    return res.json({
      message: "Confirmation recorded for IT Staff review",
      status: ticket.status,
      comment,
    });
  } catch {
    return res.status(500).json({ error: "Failed to record resolution confirmation" });
  }
});

// POST /api/tickets/:id/reopen (BR-06 : Requester owner depuis RESOLVED, ou Staff/Admin depuis RESOLVED/CLOSED)
router.post("/:id/reopen", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    if (req.user!.role === "REQUESTER") {
      if (ticket.requesterId !== req.user!.id) return res.status(403).json({ error: "Access denied" });
      if (ticket.status !== "RESOLVED") {
        return res.status(400).json({ error: "Requesters may only reopen Tickets currently in RESOLVED status." });
      }
    } else if (!["RESOLVED", "CLOSED"].includes(ticket.status)) {
      return res.status(400).json({ error: `Cannot reopen Ticket from ${ticket.status} status.` });
    }

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: "REOPENED", version: { increment: 1 } },
    });

    return res.json(updated);
  } catch {
    return res.status(500).json({ error: "Failed to reopen ticket" });
  }
});

export default router;
