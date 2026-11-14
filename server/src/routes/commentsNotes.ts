import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

async function canAccessTicket(ticketId: string, user: { id: string; role: string }) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return false;
  if (user.role === "REQUESTER" && ticket.requesterId !== user.id) return false;
  return true;
}

// Public Comments - Accessible au propriétaire du ticket et aux IT_STAFF / ADMIN
router.get("/:ticketId/comments", authenticate, async (req: AuthRequest, res: Response) => {
  if (!(await canAccessTicket(req.params.ticketId, req.user!))) {
    return res.status(404).json({ error: "Ticket not found" });
  }
  const comments = await prisma.publicComment.findMany({
    where: { ticketId: req.params.ticketId },
    include: { author: { select: { id: true, fullName: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });
  return res.json(comments);
});

router.post("/:ticketId/comments", authenticate, async (req: AuthRequest, res: Response) => {
  if (!(await canAccessTicket(req.params.ticketId, req.user!))) {
    return res.status(404).json({ error: "Ticket not found" });
  }
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: "Comment content cannot be empty" });

  const comment = await prisma.publicComment.create({
    data: {
      ticketId: req.params.ticketId,
      authorId: req.user!.id,
      content: content.trim(),
    },
    include: { author: { select: { id: true, fullName: true, role: true } } },
  });

  return res.status(201).json(comment);
});

// Internal Notes - Strictement réservé aux rôles IT_STAFF et ADMIN (AC-04)
router.get("/:ticketId/notes", authenticate, authorize(["IT_STAFF", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  const notes = await prisma.internalNote.findMany({
    where: { ticketId: req.params.ticketId },
    include: { author: { select: { id: true, fullName: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });
  return res.json(notes);
});

router.post("/:ticketId/notes", authenticate, authorize(["IT_STAFF", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: "Note content cannot be empty" });

  const note = await prisma.internalNote.create({
    data: {
      ticketId: req.params.ticketId,
      authorId: req.user!.id,
      content: content.trim(),
    },
    include: { author: { select: { id: true, fullName: true, role: true } } },
  });

  return res.status(201).json(note);
});

export default router;
