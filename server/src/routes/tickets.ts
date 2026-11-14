import { Router, Response } from "express";
import { PrismaClient, Priority } from "@prisma/client";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// GET /api/tickets - Liste des tickets du Requester authentifié (ou tous si Staff/Admin)
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { search, status, priority } = req.query;
    const where: any = {};

    if (req.user!.role === "REQUESTER") {
      where.requesterId = req.user!.id;
    }

    if (search) {
      where.OR = [
        { ticketNumber: { contains: String(search), mode: "insensitive" } },
        { summary: { contains: String(search), mode: "insensitive" } },
      ];
    }
    if (status) where.status = String(status);
    if (priority) where.requestedPriority = String(priority);

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        relatedSystem: true,
        requester: { select: { id: true, fullName: true, email: true } },
        owner: { select: { id: true, fullName: true, email: true } },
      },
    });

    return res.json({ tickets });
  } catch {
    return res.status(500).json({ error: "Failed to load tickets" });
  }
});

// POST /api/tickets - Créer un ticket avec l'identité authentifiée (FR-03, BR-03)
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

// GET /api/tickets/:id - Détail d'un ticket (vérifie ownership pour REQUESTER -> AC-03)
router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        relatedSystem: true,
        requester: { select: { id: true, fullName: true, email: true } },
        owner: { select: { id: true, fullName: true, email: true } },
        attachments: { where: { isRemoved: false } },
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    if (req.user!.role === "REQUESTER" && ticket.requesterId !== req.user!.id) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    return res.json(ticket);
  } catch {
    return res.status(500).json({ error: "Failed to load ticket details" });
  }
});

// POST /api/tickets/:id/problem-resolved - Action Requester (BR-05 : ne passe PAS directement à RESOLVED/CLOSED)
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

export default router;
