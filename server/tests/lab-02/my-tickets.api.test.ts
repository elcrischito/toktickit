import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

let requesterAId: number;
let requesterBId: number;
let categoryId: number;
let relatedSystemId: number;

async function createTicket(requesterId: number, overrides: Partial<Record<string, unknown>> = {}) {
  return request(app)
    .post("/api/tickets")
    .set("x-requester-id", String(requesterId))
    .send({
      categoryId,
      relatedSystemId,
      summary: "Default summary for test ticket",
      description: "Default description long enough to pass validation rules.",
      requestedPriority: "MEDIUM",
      ...overrides,
    });
}

beforeAll(async () => {
  const prisma = getPrisma();
  const requesters = await prisma.devRequester.findMany({ where: { isActive: true }, take: 2 });
  requesterAId = requesters[0].id;
  requesterBId = requesters[1].id;

  const category = await prisma.category.findFirst({ where: { isActive: true } });
  const relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
  categoryId = category!.id;
  relatedSystemId = relatedSystem!.id;
});

describe("GET /api/tickets (My Tickets)", () => {
  it("rejects a request with no requester context (BR-04)", async () => {
    const res = await request(app).get("/api/tickets");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_REQUESTER");
  });

  it("only returns tickets belonging to the requesting user (ownership scoping)", async () => {
    await createTicket(requesterAId, { summary: "Ticket owned by requester A only" });
    await createTicket(requesterBId, { summary: "Ticket owned by requester B only" });

    const res = await request(app)
      .get("/api/tickets")
      .set("x-requester-id", String(requesterAId));

    expect(res.status).toBe(200);
    const summaries = res.body.data.map((t: { summary: string }) => t.summary);
    expect(summaries).toContain("Ticket owned by requester A only");
    expect(summaries).not.toContain("Ticket owned by requester B only");
  });

  it("filters results by search term matching summary or ticket number", async () => {
    await createTicket(requesterAId, { summary: "Very unique searchable phrase xyz123" });

    const res = await request(app)
      .get("/api/tickets")
      .query({ search: "xyz123" })
      .set("x-requester-id", String(requesterAId));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(
      res.body.data.every((t: { summary: string }) => t.summary.includes("xyz123"))
    ).toBe(true);
  });

  it("filters results by category", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ categoryId })
      .set("x-requester-id", String(requesterAId));

    expect(res.status).toBe(200);
    expect(
      res.body.data.every((t: { categoryId: number }) => t.categoryId === categoryId)
    ).toBe(true);
  });

  it("filters results by requestedPriority", async () => {
    await createTicket(requesterAId, { requestedPriority: "HIGH", summary: "High priority ticket" });

    const res = await request(app)
      .get("/api/tickets")
      .query({ requestedPriority: "HIGH" })
      .set("x-requester-id", String(requesterAId));

    expect(res.status).toBe(200);
    expect(
      res.body.data.every((t: { requestedPriority: string }) => t.requestedPriority === "HIGH")
    ).toBe(true);
  });

  it("sorts results by createdAt descending by default", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .set("x-requester-id", String(requesterAId));

    expect(res.status).toBe(200);
    const dates = res.body.data.map((t: { createdAt: string }) => new Date(t.createdAt).getTime());
    const sorted = [...dates].sort((a, b) => b - a);
    expect(dates).toEqual(sorted);
  });

  it("paginates results according to page and pageSize", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ page: 1, pageSize: 10 })
      .set("x-requester-id", String(requesterAId));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(10);
    expect(res.body.meta).toHaveProperty("totalItems");
    expect(res.body.meta).toHaveProperty("totalPages");
    expect(res.body.meta.pageSize).toBe(10);
  });

  it("returns an empty list (not an error) when a requester has no tickets", async () => {
    const prisma = getPrisma();
    const emptyRequester = await prisma.devRequester.create({
      data: { name: "Empty Test Requester", email: `empty-${Date.now()}@test.local`, isActive: true },
    });

    const res = await request(app)
      .get("/api/tickets")
      .set("x-requester-id", String(emptyRequester.id));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.totalItems).toBe(0);
  });
});