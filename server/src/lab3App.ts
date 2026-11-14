import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import authRoutes from "./routes/auth";
import staffTicketsRoutes from "./routes/staffTickets";
import ticketsRoutes from "./routes/tickets";
import commentsNotesRoutes from "./routes/commentsNotes";
import adminUsersRoutes from "./routes/adminUsers";
import actionsTakenRoutes from "./routes/actionsTaken";
import dashboardRoutes from "./routes/dashboard";

const prisma = new PrismaClient();
export const lab3App = express();

lab3App.use(cors());
lab3App.use(express.json());

lab3App.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

lab3App.get("/api/categories", async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    res.json(categories);
  } catch {
    res.status(500).json({ error: "Failed to load categories" });
  }
});

lab3App.get("/api/related-systems", async (_req, res) => {
  try {
    const systems = await prisma.relatedSystem.findMany({ orderBy: { name: "asc" } });
    res.json(systems);
  } catch {
    res.status(500).json({ error: "Failed to load related systems" });
  }
});

lab3App.use("/api/auth", authRoutes);
lab3App.use("/api/staff/tickets", staffTicketsRoutes);
lab3App.use("/api/tickets", ticketsRoutes);
lab3App.use("/api/tickets", commentsNotesRoutes);
lab3App.use("/api/tickets", actionsTakenRoutes);
lab3App.use("/api/admin/users", adminUsersRoutes);
lab3App.use("/api/dashboard", dashboardRoutes);

export default lab3App;
