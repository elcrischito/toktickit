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
// Issue 5 — Development Requester context (Lab 2)
app.get("/api/dev-requesters", async (_req: Request, res: Response) => {
  try {
    const devRequesters = await getPrisma().devRequester.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    });
    res.status(200).json(devRequesters);
  } catch {
    res.status(500).json({ error: "Unable to load development requesters" });
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
// Issue 8 — Ticket creation (Lab 2)
// BR-01: unique backend-generated Ticket Number, format TKT-YYYY-NNNNNN
async function generateTicketNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await getPrisma().ticket.count();
  const sequence = String(count + 1).padStart(6, "0");
  return `TKT-${year}-${sequence}`;
}

const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

app.post("/api/tickets", async (req: Request, res: Response) => {
  const requesterId = Number(req.header("x-requester-id"));
  const { categoryId, relatedSystemId, summary, description, requestedPriority } = req.body ?? {};

  // BR-04 — validate the Development Requester context
  if (!requesterId || Number.isNaN(requesterId)) {
    return res.status(400).json({
      error: { code: "INVALID_REQUESTER", message: "A valid requester context is required." },
    });
  }

  try {
    const requester = await getPrisma().devRequester.findUnique({ where: { id: requesterId } });
    if (!requester || !requester.isActive) {
      return res.status(400).json({
        error: { code: "INVALID_REQUESTER", message: "Requester is invalid or inactive." },
      });
    }

    // Field-level validation (BR-07, BR-08, BR-09, BR-10)
    const fields: Record<string, string> = {};
    const trimmedSummary = typeof summary === "string" ? summary.trim() : "";
    const trimmedDescription = typeof description === "string" ? description.trim() : "";

    if (trimmedSummary.length < 5 || trimmedSummary.length > 120) {
      fields.summary = "Summary must be between 5 and 120 characters.";
    }
    if (trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
      fields.description = "Description must be between 10 and 2000 characters.";
    }
    if (!VALID_PRIORITIES.includes(requestedPriority)) {
      fields.requestedPriority = "Requested priority must be LOW, MEDIUM, or HIGH.";
    }

    const category = categoryId
      ? await getPrisma().category.findUnique({ where: { id: Number(categoryId) } })
      : null;
    if (!category || !category.isActive) {
      fields.categoryId = "Category is required and must be active.";
    }

    const relatedSystem = relatedSystemId
      ? await getPrisma().relatedSystem.findUnique({ where: { id: Number(relatedSystemId) } })
      : null;
    if (!relatedSystem || !relatedSystem.isActive) {
      fields.relatedSystemId = "Related System is required and must be active.";
    }

    if (Object.keys(fields).length > 0) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "One or more fields are invalid.", fields },
      });
    }

    // BR-01 — generate the official Ticket Number
    const ticketNumber = await generateTicketNumber();

    const ticket = await getPrisma().ticket.create({
      data: {
        ticketNumber,
        requesterId,
        categoryId: Number(categoryId),
        relatedSystemId: Number(relatedSystemId),
        summary: trimmedSummary,
        description: trimmedDescription,
        requestedPriority,
      },
    });

    res.status(201).json(ticket);
  } catch {
    res.status(500).json({ error: { code: "SERVER_ERROR", message: "Unable to create ticket." } });
  }
});

// ---------------------------------------------------------------------------

export default app;