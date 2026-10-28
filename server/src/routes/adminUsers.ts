import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// Toutes les routes admin nécessitent le rôle ADMIN
router.use(authenticate, authorize(["ADMIN"]));

// GET /api/admin/users
router.get("/", async (req: AuthRequest, res: Response) => {
  const { search, role } = req.query;
  const where: any = {};

  if (search) {
    where.OR = [
      { fullName: { contains: search as string, mode: "insensitive" } },
      { email: { contains: search as string, mode: "insensitive" } },
    ];
  }

  if (role) where.role = role as Role;

  const users = await prisma.user.findMany({
    where,
    select: { id: true, fullName: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return res.json(users);
});

// POST /api/admin/users - Créer un compte
router.post("/", async (req: AuthRequest, res: Response) => {
  const { fullName, email, role, initialPassword, isActive } = req.body;

  if (!fullName || !email || !initialPassword || !role) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ error: "Email already in use" });

  const passwordHash = await bcrypt.hash(initialPassword, 10);
  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      role: role as Role,
      passwordHash,
      isActive: isActive !== undefined ? isActive : true,
      mustChangePassword: true,
    },
    select: { id: true, fullName: true, email: true, role: true, isActive: true, mustChangePassword: true },
  });

  return res.status(201).json(user);
});

// PATCH /api/admin/users/:id - Modifier le compte
router.patch("/:id", async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { fullName, email, role, isActive } = req.body;

  // Règles de sécurité Admin (BR-06)
  if (id === req.user!.id && isActive === false) {
    return res.status(400).json({ error: "An administrator cannot deactivate their own account" });
  }

  if (isActive === false) {
    const activeAdminCount = await prisma.user.count({
      where: { role: Role.ADMIN, isActive: true },
    });
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (targetUser?.role === Role.ADMIN && activeAdminCount <= 1) {
      return res.status(400).json({ error: "Cannot deactivate the last active administrator" });
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(fullName && { fullName }),
      ...(email && { email }),
      ...(role && { role: role as Role }),
      ...(isActive !== undefined && { isActive }),
    },
    select: { id: true, fullName: true, email: true, role: true, isActive: true },
  });

  return res.json(updated);
});

// POST /api/admin/users/:id/reset-password - Réinitialiser mot de passe initial
router.post("/:id/reset-password", async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { newInitialPassword } = req.body;

  if (!newInitialPassword || newInitialPassword.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const passwordHash = await bcrypt.hash(newInitialPassword, 10);
  await prisma.user.update({
    where: { id },
    data: {
      passwordHash,
      mustChangePassword: true,
    },
  });

  return res.json({ message: "Initial password updated successfully" });
});

export default router;
