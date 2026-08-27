import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";

export const app = express();
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Issue 2 — API health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(categories);
  } catch {
    res.status(500).json({ error: "Unable to load categories" });
  }
});

// ---------------------------------------------------------------------------
// Issue 7 — Related Systems reference data (Lab 2)
app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const relatedSystems = await getPrisma().relatedSystem.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(relatedSystems);
  } catch {
    res.status(500).json({ error: "Unable to load related systems" });
  }
});

// ---------------------------------------------------------------------------

export default app;