import { Router, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import path from "path";
import { authenticate, AuthRequest } from "../middleware/auth";

// Lab 2 attachment lifecycle (BR-13..BR-18), re-wired onto the Lab 3 JWT session.
// Lab 5: file content is stored in PostgreSQL (Attachment.data), never on the
// container disk, because Cloud Run starts a fresh container on every deploy.

const prisma = new PrismaClient();

export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"]; // BR-13
export const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"]; // BR-13
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // BR-14
export const MAX_ACTIVE_ATTACHMENTS = 5; // BR-15

// Metadata only: the (large) file bytes are loaded only by the download route.
export const ATTACHMENT_METADATA = {
  id: true,
  ticketId: true,
  filename: true,
  originalName: true,
  mimeType: true,
  size: true,
  isRemoved: true,
  removedAt: true,
  removedReason: true,
  createdAt: true,
} as const;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype) || !ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error("UNSUPPORTED_FILE_TYPE"));
    }
    cb(null, true);
  },
});

const isStaffRole = (role?: string) => role === "IT_STAFF" || role === "ADMIN";

const toDto = (a: {
  id: string;
  ticketId: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  isRemoved: boolean;
  removedAt: Date | null;
  removedReason: string | null;
}) => ({
  id: a.id,
  ticketId: a.ticketId,
  fileName: a.originalName,
  mimeType: a.mimeType,
  sizeBytes: a.size,
  uploadedAt: a.createdAt,
  isRemoved: a.isRemoved,
  removedAt: a.removedAt,
  removalReason: a.removedReason,
});

// Runs multer and turns its errors into the error codes from docs/lab-02/api-spec.md
const handleUpload = (req: AuthRequest, res: Response, next: NextFunction) => {
  upload.single("file")(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: { code: "FILE_TOO_LARGE", message: "File is too large. Maximum size is 5 MB." } });
    }
    if (err instanceof Error && err.message === "UNSUPPORTED_FILE_TYPE") {
      return res.status(400).json({ error: { code: "UNSUPPORTED_FILE_TYPE", message: "Only JPG, PNG, WEBP, and PDF files are allowed." } });
    }
    return res.status(500).json({ error: { code: "SERVER_ERROR", message: "Unable to upload attachment." } });
  });
};

// ---------------------------------------------------------------------------
// Mounted on /api/tickets
export const ticketAttachmentsRouter = Router();

// GET /api/tickets/:id/attachments — owner Requester, IT Staff, Admin (read)
ticketAttachmentsRouter.get("/:id/attachments", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket || (!isStaffRole(req.user!.role) && ticket.requesterId !== req.user!.id)) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found." } });
    }
    const attachments = await prisma.attachment.findMany({
      where: { ticketId: ticket.id },
      orderBy: { createdAt: "desc" },
      select: ATTACHMENT_METADATA,
    });
    return res.json({ data: attachments.map(toDto) });
  } catch {
    return res.status(500).json({ error: { code: "SERVER_ERROR", message: "Unable to load attachments." } });
  }
});

// POST /api/tickets/:id/attachments — owner Requester only (BR-18)
ticketAttachmentsRouter.post("/:id/attachments", authenticate, handleUpload, async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: { code: "NO_FILE", message: "No file was uploaded." } });
  }
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket || ticket.requesterId !== req.user!.id) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found." } });
    }

    const activeCount = await prisma.attachment.count({ where: { ticketId: ticket.id, isRemoved: false } });
    if (activeCount >= MAX_ACTIVE_ATTACHMENTS) {
      return res.status(400).json({
        error: { code: "ATTACHMENT_LIMIT_REACHED", message: `A ticket can have at most ${MAX_ACTIVE_ATTACHMENTS} active attachments.` },
      });
    }

    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(req.file.originalname).toLowerCase()}`;
    const created = await prisma.attachment.create({
      data: {
        ticketId: ticket.id,
        filename: unique,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: "db", // content lives in the `data` column (Lab 5)
        data: req.file.buffer,
      },
      select: ATTACHMENT_METADATA,
    });
    return res.status(201).json({ data: toDto(created) });
  } catch {
    return res.status(500).json({ error: { code: "SERVER_ERROR", message: "Unable to upload attachment." } });
  }
});

// ---------------------------------------------------------------------------
// Mounted on /api/attachments
export const attachmentsRouter = Router();

// GET /api/attachments/:id/download — owner Requester, IT Staff, Admin
attachmentsRouter.get("/:id/download", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: req.params.id },
      select: { ...ATTACHMENT_METADATA, data: true, ticket: { select: { requesterId: true } } },
    });
    if (!attachment || (!isStaffRole(req.user!.role) && attachment.ticket.requesterId !== req.user!.id)) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Attachment not found." } });
    }
    if (attachment.isRemoved) {
      return res.status(403).json({ error: { code: "ATTACHMENT_REMOVED", message: "This attachment has been removed." } });
    }
    if (!attachment.data) {
      // Rows uploaded before Lab 5 were stored on a local disk that no longer exists.
      return res.status(404).json({ error: { code: "FILE_MISSING", message: "File content is not available." } });
    }
    res.setHeader("Content-Type", attachment.mimeType);
    res.setHeader("Content-Length", String(attachment.data.length));
    res.attachment(attachment.originalName);
    return res.send(Buffer.from(attachment.data));
  } catch {
    return res.status(500).json({ error: { code: "SERVER_ERROR", message: "Unable to download attachment." } });
  }
});

// DELETE /api/attachments/:id — owner Requester only, soft removal with reason (BR-16, BR-17, BR-18)
attachmentsRouter.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const reason = typeof req.body?.removalReason === "string" ? req.body.removalReason.trim() : "";
  if (reason.length < 3 || reason.length > 200) {
    return res.status(400).json({
      error: { code: "INVALID_REMOVAL_REASON", message: "Removal reason must be between 3 and 200 characters." },
    });
  }
  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: req.params.id },
      select: { ...ATTACHMENT_METADATA, ticket: { select: { requesterId: true } } },
    });
    if (!attachment || attachment.ticket.requesterId !== req.user!.id) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Attachment not found." } });
    }
    if (attachment.isRemoved) {
      return res.status(409).json({ error: { code: "ALREADY_REMOVED", message: "This attachment was already removed." } });
    }
    const updated = await prisma.attachment.update({
      where: { id: attachment.id },
      data: { isRemoved: true, removedAt: new Date(), removedReason: reason },
      select: ATTACHMENT_METADATA,
    });
    return res.json({
      data: { id: updated.id, isRemoved: true, removedAt: updated.removedAt, removalReason: updated.removedReason },
    });
  } catch {
    return res.status(500).json({ error: { code: "SERVER_ERROR", message: "Unable to remove attachment." } });
  }
});
