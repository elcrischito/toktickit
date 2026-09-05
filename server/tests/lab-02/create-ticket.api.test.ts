import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

let requesterId: number;
let categoryId: number;
let relatedSystemId: number;

beforeAll(async () => {
  const prisma = getPrisma();
  const requester = await prisma.devRequester.findFirst({ where: { isActive: true } });
  const category = await prisma.category.findFirst({ where: { isActive: true } });
  const relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
  requesterId = requester!.id;
  categoryId = category!.id;
  relatedSystemId = relatedSystem!.id;
});

describe("POST /api/tickets", () => {
  it("creates a ticket and returns 201 with a generated ticket number (AC-01)", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("x-requester-id", String(requesterId))
      .send({
        categoryId,
        relatedSystemId,
        summary: "Laptop battery drains quickly",
        description: "The battery drains much faster than usual, even when idle.",
        requestedPriority: "MEDIUM",
      });

    expect(res.status).toBe(201);
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(res.body.currentStatus).toBe("NEW");
  });

  it("rejects a summary that is too short (BR-07, AC-04)", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("x-requester-id", String(requesterId))
      .send({
        categoryId,
        relatedSystemId,
        summary: "Hi",
        description: "The battery drains much faster than usual, even when idle.",
        requestedPriority: "MEDIUM",
      });

    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty("summary");
  });

  it("rejects a missing requester context (BR-04)", async () => {
    const res = await request(app).post("/api/tickets").send({
      categoryId,
      relatedSystemId,
      summary: "Laptop battery drains quickly",
      description: "The battery drains much faster than usual, even when idle.",
      requestedPriority: "MEDIUM",
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_REQUESTER");
  });

  it("rejects an inactive requester (BR-04)", async () => {
    const prisma = getPrisma();
    const inactive = await prisma.devRequester.findFirst({ where: { isActive: false } });

    const res = await request(app)
      .post("/api/tickets")
      .set("x-requester-id", String(inactive!.id))
      .send({
        categoryId,
        relatedSystemId,
        summary: "Laptop battery drains quickly",
        description: "The battery drains much faster than usual, even when idle.",
        requestedPriority: "MEDIUM",
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_REQUESTER");
  });
});