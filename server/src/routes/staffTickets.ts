import { Router, Response } from "express";
import { PrismaClient, Priority, Status } from "@prisma/client";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// GET /api/staff/tickets - Recherche, filtres, tri et pagination
router.get("/", authenticate, authorize(["IT_STAFF", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const { search, status, priority, page = "1", limit = "10" } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
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
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch ticket queue" });
  }
});

// PATCH /api/staff/tickets/:id - Modifier propriétaire, priorité IT ou statut
router.patch("/:id", authenticate, authorize(["IT_STAFF", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { ownerId, itPriority, status, resolutionSummary } = req.body;

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    const updated = await prisma.ticket.update({
      where: { id },
      data: {
        ...(ownerId !== undefined && { ownerId }),
        ...(itPriority && { itPriority: itPriority as Priority }),
        ...(status && { status: status as Status }),
        ...(resolutionSummary !== undefined && { resolutionSummary }),
      },
      include: {
        category: true,
        relatedSystem: true,
        requester: { select: { id: true, fullName: true, email: true } },
        owner: { select: { id: true, fullName: true, email: true } },
      },
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: "Failed to update ticket" });
  }
});

export default router;
