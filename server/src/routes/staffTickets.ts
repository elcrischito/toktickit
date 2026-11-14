import { Router, Response } from "express";
import { PrismaClient, Priority, Status } from "@prisma/client";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

export const ALLOWED_STAFF_TRANSITIONS: Record<Status, Status[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["OPEN", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  CLOSED: ["REOPENED"],
  CANCELLED: [],
};

// GET /api/staff/tickets/agents
router.get("/agents", authenticate, authorize(["IT_STAFF", "ADMIN"]), async (_req: AuthRequest, res: Response) => {
  try {
    const agents = await prisma.user.findMany({
      where: { isActive: true, role: { in: ["IT_STAFF", "ADMIN"] } },
      select: { id: true, fullName: true, email: true, role: true },
      orderBy: { fullName: "asc" },
    });
    return res.json(agents);
  } catch {
    return res.status(500).json({ error: "Failed to load IT agents" });
  }
});

// GET /api/staff/tickets (supporte unassigned=true et ownerId=me pour drill-down)
router.get("/", authenticate, authorize(["IT_STAFF", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const { search, status, priority, unassigned, ownerId, page = "1", limit = "10" } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { ticketNumber: { contains: search as string, mode: "insensitive" } },
        { summary: { contains: search as string, mode: "insensitive" } },
      ];
    }

    if (status) where.status = status as Status;
    if (priority) where.itPriority = priority as Priority;
    if (unassigned === "true") {
      where.ownerId = null;
      where.status = { notIn: ["CLOSED", "CANCELLED"] };
    } else if (ownerId === "me") {
      where.ownerId = req.user!.id;
      where.status = { notIn: ["CLOSED", "CANCELLED"] };
    } else if (ownerId) {
      where.ownerId = String(ownerId);
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
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
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch ticket queue" });
  }
});

// PATCH /api/staff/tickets/:id
router.patch("/:id", authenticate, authorize(["IT_STAFF", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { ownerId, itPriority, status, resolutionSummary, version } = req.body;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        category: true,
        relatedSystem: true,
        requester: { select: { id: true, fullName: true, email: true } },
        owner: { select: { id: true, fullName: true, email: true } },
      },
    });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    if (version !== undefined && Number(version) !== ticket.version) {
      return res.status(409).json({
        error: "Conflict: Ticket was updated by another user. Refresh and retry.",
        current: ticket,
      });
    }

    if (status && status !== ticket.status) {
      const targetStatus = status as Status;
      const allowed = ALLOWED_STAFF_TRANSITIONS[ticket.status] || [];
      if (!allowed.includes(targetStatus)) {
        return res.status(400).json({
          error: `Illegal status transition from ${ticket.status} to ${targetStatus}.`,
        });
      }

      if (targetStatus === "RESOLVED") {
        const nextResolution = resolutionSummary !== undefined
          ? String(resolutionSummary).trim()
          : (ticket.resolutionSummary || "").trim();
        if (!nextResolution) {
          return res.status(400).json({
            error: "Resolution Summary is required before marking a Ticket as Resolved.",
          });
        }
      }
    }

    if (ownerId) {
      const owner = await prisma.user.findUnique({ where: { id: String(ownerId) } });
      if (!owner || !owner.isActive || !["IT_STAFF", "ADMIN"].includes(owner.role)) {
        return res.status(400).json({ error: "Ticket Owner must be an active IT Staff or Admin user." });
      }
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: {
        ...(ownerId !== undefined && { ownerId: ownerId || null }),
        ...(itPriority && { itPriority: itPriority as Priority }),
        ...(status && { status: status as Status }),
        ...(resolutionSummary !== undefined && { resolutionSummary: String(resolutionSummary).trim() || null }),
        version: { increment: 1 },
      },
      include: {
        category: true,
        relatedSystem: true,
        requester: { select: { id: true, fullName: true, email: true } },
        owner: { select: { id: true, fullName: true, email: true } },
      },
    });

    return res.json(updated);
  } catch {
    return res.status(500).json({ error: "Failed to update ticket" });
  }
});

export default router;
