import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// Public Comments - Accessible à tous les utilisateurs authentifiés
router.get("/:ticketId/comments", authenticate, async (req: AuthRequest, res: Response) => {
  const comments = await prisma.publicComment.findMany({
    where: { ticketId: req.params.ticketId },
    include: { author: { select: { id: true, fullName: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });
  return res.json(comments);
});

router.post("/:ticketId/comments", authenticate, async (req: AuthRequest, res: Response) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: "Comment content cannot be empty" });

  const comment = await prisma.publicComment.create({
    data: {
      ticketId: req.params.ticketId,
      authorId: req.user!.id,
      content,
    },
    include: { author: { select: { id: true, fullName: true, role: true } } },
  });

  return res.json(comment);
});

// Internal Notes - Strictement réservé aux rôles IT_STAFF et ADMIN
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
      content,
    },
    include: { author: { select: { id: true, fullName: true, role: true } } },
  });

  return res.json(note);
});

export default router;
