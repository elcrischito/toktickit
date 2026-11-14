import { Router, Response } from "express";
import { PrismaClient, ActionStatus } from "@prisma/client";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();
const VALID_ACTION_STATUSES: ActionStatus[] = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

// GET /api/tickets/:id/actions
router.get("/:id/actions", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    if (req.user!.role === "REQUESTER" && ticket.requesterId !== req.user!.id) {
      return res.status(403).json({ error: "Access denied to this ticket's actions" });
    }

    const actions = await prisma.actionTaken.findMany({
      where: { ticketId: ticket.id },
      orderBy: [{ actionDateTime: "asc" }, { id: "asc" }],
      include: {
        performedBy: { select: { id: true, fullName: true, role: true } },
        assignedTo: { select: { id: true, fullName: true, role: true, isActive: true } },
      },
    });

    return res.json({ actions });
  } catch {
    return res.status(500).json({ error: "Failed to load Actions Taken" });
  }
});

// POST /api/tickets/:id/actions
router.post("/:id/actions", authenticate, authorize(["IT_STAFF", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    const {
      actionDateTime,
      description,
      result,
      status,
      assignedToId,
      followUpRequired,
      followUpNote,
      attachmentNotes,
    } = req.body;

    const trimmedDesc = typeof description === "string" ? description.trim() : "";
    const trimmedResult = typeof result === "string" ? result.trim() : "";
    if (!trimmedDesc) return res.status(400).json({ error: "Action Description is required." });
    if (!trimmedResult) return res.status(400).json({ error: "Action Result is required." });

    const actionStatus: ActionStatus = status || "COMPLETED";
    if (!VALID_ACTION_STATUSES.includes(actionStatus)) {
      return res.status(400).json({ error: "Invalid Action Taken status." });
    }

    const needsFollowUp = Boolean(followUpRequired);
    const trimmedFollowUp = typeof followUpNote === "string" ? followUpNote.trim() : "";
    if (needsFollowUp && !trimmedFollowUp) {
      return res.status(400).json({ error: "Follow-up Note is required when Follow-Up Required is checked." });
    }

    let validAssigneeId: string | null = null;
    if (assignedToId) {
      const assignee = await prisma.user.findUnique({ where: { id: String(assignedToId) } });
      if (!assignee || !assignee.isActive || !["IT_STAFF", "ADMIN"].includes(assignee.role)) {
        return res.status(400).json({ error: "Assigned staff member must be an active IT Staff or Admin user." });
      }
      validAssigneeId = assignee.id;
    }

    const parsedDate = actionDateTime ? new Date(actionDateTime) : new Date();
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: "Invalid Action Date/Time." });
    }

    const created = await prisma.actionTaken.create({
      data: {
        ticketId: ticket.id,
        actionDateTime: parsedDate,
        description: trimmedDesc,
        result: trimmedResult,
        status: actionStatus,
        performedById: req.user!.id,
        assignedToId: validAssigneeId,
        followUpRequired: needsFollowUp,
        followUpNote: needsFollowUp ? trimmedFollowUp : trimmedFollowUp || null,
        attachmentNotes: typeof attachmentNotes === "string" && attachmentNotes.trim() ? attachmentNotes.trim() : null,
      },
      include: {
        performedBy: { select: { id: true, fullName: true, role: true } },
        assignedTo: { select: { id: true, fullName: true, role: true, isActive: true } },
      },
    });

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { updatedAt: new Date() },
    });

    return res.status(201).json(created);
  } catch {
    return res.status(500).json({ error: "Failed to create Action Taken" });
  }
});

// PATCH /api/tickets/:id/actions/:actionId
router.patch("/:id/actions/:actionId", authenticate, authorize(["IT_STAFF", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.actionTaken.findFirst({
      where: { id: req.params.actionId, ticketId: req.params.id },
      include: {
        performedBy: { select: { id: true, fullName: true, role: true } },
        assignedTo: { select: { id: true, fullName: true, role: true, isActive: true } },
      },
    });
    if (!existing) return res.status(404).json({ error: "Action Taken not found" });

    const {
      actionDateTime,
      description,
      result,
      status,
      assignedToId,
      followUpRequired,
      followUpNote,
      attachmentNotes,
      version,
    } = req.body;

    if (version !== undefined && Number(version) !== existing.version) {
      return res.status(409).json({
        error: "Conflict: This Action Taken was modified by another user. Please refresh and try again.",
        current: existing,
      });
    }

    const nextDesc = description !== undefined ? String(description).trim() : existing.description;
    const nextResult = result !== undefined ? String(result).trim() : existing.result;
    if (!nextDesc) return res.status(400).json({ error: "Action Description cannot be empty." });
    if (!nextResult) return res.status(400).json({ error: "Action Result cannot be empty." });

    const nextStatus: ActionStatus = status !== undefined ? status : existing.status;
    if (!VALID_ACTION_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ error: "Invalid Action Taken status." });
    }

    const nextFollowUpReq = followUpRequired !== undefined ? Boolean(followUpRequired) : existing.followUpRequired;
    const nextFollowUpNote = followUpNote !== undefined
      ? (typeof followUpNote === "string" ? followUpNote.trim() : "")
      : (existing.followUpNote || "");
    if (nextFollowUpReq && !nextFollowUpNote) {
      return res.status(400).json({ error: "Follow-up Note is required when Follow-Up Required is checked." });
    }

    let nextAssigneeId = existing.assignedToId;
    if (assignedToId !== undefined) {
      if (!assignedToId) {
        nextAssigneeId = null;
      } else {
        const assignee = await prisma.user.findUnique({ where: { id: String(assignedToId) } });
        if (!assignee || !assignee.isActive || !["IT_STAFF", "ADMIN"].includes(assignee.role)) {
          return res.status(400).json({ error: "Assigned staff member must be an active IT Staff or Admin user." });
        }
        nextAssigneeId = assignee.id;
      }
    }

    const nextDate = actionDateTime !== undefined ? new Date(actionDateTime) : existing.actionDateTime;
    if (Number.isNaN(nextDate.getTime())) {
      return res.status(400).json({ error: "Invalid Action Date/Time." });
    }

    // Atomic optimistic-concurrency write (BR-08): the extra `version` filter makes Prisma
    // throw P2025 if another user saved this Action Taken in the meantime.
    const updated = await prisma.actionTaken.update({
      where: { id: existing.id, version: existing.version },
      data: {
        actionDateTime: nextDate,
        description: nextDesc,
        result: nextResult,
        status: nextStatus,
        assignedToId: nextAssigneeId,
        followUpRequired: nextFollowUpReq,
        followUpNote: nextFollowUpNote || null,
        ...(attachmentNotes !== undefined && {
          attachmentNotes: typeof attachmentNotes === "string" && attachmentNotes.trim() ? attachmentNotes.trim() : null,
        }),
        version: { increment: 1 },
      },
      include: {
        performedBy: { select: { id: true, fullName: true, role: true } },
        assignedTo: { select: { id: true, fullName: true, role: true, isActive: true } },
      },
    });

    return res.json(updated);
  } catch (err: any) {
    if (err?.code === "P2025") {
      return res.status(409).json({
        error: "Conflict: This Action Taken was modified by another user. Please refresh and try again.",
      });
    }
    return res.status(500).json({ error: "Failed to update Action Taken" });
  }
});

export default router;
