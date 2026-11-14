import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// GET /api/dashboard/staff
router.get("/staff", authenticate, authorize(["IT_STAFF", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const [
      newCount,
      openCount,
      inProgressCount,
      waitingForRequesterCount,
      unassignedCount,
      myAssignedCount,
      highPriorityOpenCount,
      myActionsCount,
      recentTickets,
      myRecentActions,
    ] = await Promise.all([
      prisma.ticket.count({ where: { status: "NEW" } }),
      prisma.ticket.count({ where: { status: "OPEN" } }),
      prisma.ticket.count({ where: { status: "IN_PROGRESS" } }),
      prisma.ticket.count({ where: { status: "WAITING_FOR_REQUESTER" } }),
      prisma.ticket.count({
        where: { ownerId: null, status: { notIn: ["CLOSED", "CANCELLED"] } },
      }),
      prisma.ticket.count({
        where: { ownerId: userId, status: { notIn: ["CLOSED", "CANCELLED"] } },
      }),
      prisma.ticket.count({
        where: { itPriority: "HIGH", status: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] } },
      }),
      prisma.actionTaken.count({
        where: { OR: [{ performedById: userId }, { assignedToId: userId }] },
      }),
      prisma.ticket.findMany({
        where: { status: { notIn: ["CLOSED", "CANCELLED"] } },
        orderBy: [{ updatedAt: "desc" }],
        take: 5,
        include: {
          category: true,
          requester: { select: { id: true, fullName: true } },
          owner: { select: { id: true, fullName: true } },
        },
      }),
      prisma.actionTaken.findMany({
        where: { OR: [{ performedById: userId }, { assignedToId: userId }] },
        orderBy: [{ actionDateTime: "desc" }],
        take: 5,
        include: {
          ticket: { select: { id: true, ticketNumber: true, summary: true, status: true } },
          performedBy: { select: { id: true, fullName: true } },
          assignedTo: { select: { id: true, fullName: true } },
        },
      }),
    ]);

    let userSummary = undefined;
    if (req.user!.role === "ADMIN") {
      const [totalUsers, activeUsers] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
      ]);
      userSummary = {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
      };
    }

    return res.json({
      metrics: {
        newCount,
        openCount,
        inProgressCount,
        waitingForRequesterCount,
        unassignedCount,
        myAssignedCount,
        highPriorityOpenCount,
        myActionsCount,
      },
      ...(userSummary && { userSummary }),
      recentTickets,
      myRecentActions,
    });
  } catch {
    return res.status(500).json({ error: "Failed to load IT Staff dashboard" });
  }
});

// GET /api/dashboard/requester
router.get("/requester", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const [
      myOpenCount,
      inProgressCount,
      waitingForMeCount,
      resolvedCount,
      closedCount,
      attentionTickets,
      recentTickets,
    ] = await Promise.all([
      prisma.ticket.count({
        where: { requesterId: userId, status: { in: ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"] } },
      }),
      prisma.ticket.count({
        where: { requesterId: userId, status: "IN_PROGRESS" },
      }),
      prisma.ticket.count({
        where: { requesterId: userId, status: "WAITING_FOR_REQUESTER" },
      }),
      prisma.ticket.count({
        where: { requesterId: userId, status: "RESOLVED" },
      }),
      prisma.ticket.count({
        where: { requesterId: userId, status: "CLOSED" },
      }),
      prisma.ticket.findMany({
        where: { requesterId: userId, status: { in: ["WAITING_FOR_REQUESTER", "RESOLVED"] } },
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: {
          category: true,
          owner: { select: { id: true, fullName: true } },
        },
      }),
      prisma.ticket.findMany({
        where: { requesterId: userId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: {
          category: true,
          owner: { select: { id: true, fullName: true } },
        },
      }),
    ]);

    return res.json({
      metrics: {
        myOpenCount,
        inProgressCount,
        waitingForMeCount,
        resolvedCount,
        closedCount,
      },
      attentionTickets,
      recentTickets,
    });
  } catch {
    return res.status(500).json({ error: "Failed to load Requester dashboard" });
  }
});

export default router;
