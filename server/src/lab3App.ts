import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import authRoutes from "./routes/auth";
import staffTicketsRoutes from "./routes/staffTickets";
import ticketsRoutes from "./routes/tickets";
import commentsNotesRoutes from "./routes/commentsNotes";
import adminUsersRoutes from "./routes/adminUsers";
import actionsTakenRoutes from "./routes/actionsTaken";
import dashboardRoutes from "./routes/dashboard";
import { ticketAttachmentsRouter, attachmentsRouter } from "./routes/attachments";

const prisma = new PrismaClient();
export const lab3App = express();

// CORS_ORIGIN (optional, comma-separated). In the cloud the UI and API share one
// origin, so it is not needed there; left unset it keeps the old allow-all behaviour.
const corsOrigins = process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()).filter(Boolean);
lab3App.use(cors(corsOrigins && corsOrigins.length > 0 ? { origin: corsOrigins } : undefined));
lab3App.use(express.json());

lab3App.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "TokTickIT API", timestamp: new Date() });
});

// Readiness (Lab 5): 503 when the database cannot be reached. Used by the smoke test.
lab3App.get("/api/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ready", db: "connected" });
  } catch {
    res.status(503).json({ status: "not_ready", db: "unreachable" });
  }
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
lab3App.use("/api/tickets", ticketAttachmentsRouter);
lab3App.use("/api/attachments", attachmentsRouter);

// Unknown API routes return JSON 404 instead of the SPA page.
lab3App.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Lab 5: in the single Cloud Run container the Express server also serves the built
// React app. CLIENT_DIST_DIR defaults to ../client/dist next to the server folder
// (the layout of the root Dockerfile). Nothing happens if the folder does not exist,
// so local development with Vite is unchanged.
const clientDist = process.env.CLIENT_DIST_DIR || path.resolve(process.cwd(), "..", "client", "dist");
if (fs.existsSync(path.join(clientDist, "index.html"))) {
  lab3App.use(express.static(clientDist, { index: false, maxAge: "1h" }));
  lab3App.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

export default lab3App;
