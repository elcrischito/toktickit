import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

let requesterAId: number;
let requesterBId: number;
let categoryId: number;
let relatedSystemId: number;
let ticketId: number;

async function createTicket(requesterId: number, overrides: Partial<Record<string, unknown>> = {}) {
  const res = await request(app)
    .post("/api/tickets")
    .set("x-requester-id", String(requesterId))
    .send({
      categoryId,
      relatedSystemId,
      summary: "Ticket for detail/attachment tests",
      description: "Description long enough to pass validation rules for testing.",
      requestedPriority: "MEDIUM",
      ...overrides,
    });
  return res.body.id as number;
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

  ticketId = await createTicket(requesterAId);
});

describe("GET /api/tickets/:id (Ticket Detail)", () => {
  it("rejects a request with no requester context (BR-04)", async () => {
    const res = await request(app).get(`/api/tickets/${ticketId}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_REQUESTER");
  });

  it("returns full ticket detail for the owning requester", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set("x-requester-id", String(requesterAId));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(ticketId);
    expect(res.body).toHaveProperty("description");
    expect(res.body).toHaveProperty("categoryName");
    expect(res.body).toHaveProperty("relatedSystemName");
    expect(res.body).toHaveProperty("requesterName");
    expect(Array.isArray(res.body.attachments)).toBe(true);
  });

  it("returns 404 when a different requester tries to view the ticket (ownership)", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set("x-requester-id", String(requesterBId));

    expect(res.status).toBe(404);
  });

  it("returns 404 for a non-existent ticket id", async () => {
    const res = await request(app)
      .get("/api/tickets/999999")
      .set("x-requester-id", String(requesterAId));

    expect(res.status).toBe(404);
  });
});

describe("POST /api/tickets/:id/attachments (Upload)", () => {
  it("rejects a request with no requester context", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .attach("file", Buffer.from("hello world"), "note.txt");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_REQUESTER");
  });

  it("rejects a request with no file", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("x-requester-id", String(requesterAId));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("NO_FILE");
  });

  it("uploads a file successfully for the owning requester", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("x-requester-id", String(requesterAId))
      .attach("file", Buffer.from("hello world"), "note.txt");

    expect(res.status).toBe(201);
    expect(res.body.originalName).toBe("note.txt");
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("size");
  });

  it("rejects an upload from a non-owning requester", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("x-requester-id", String(requesterBId))
      .attach("file", Buffer.from("hello world"), "note2.txt");

    expect(res.status).toBe(404);
  });
});

describe("GET /api/tickets/:id/attachments/:attachmentId (Download) and DELETE (soft-remove)", () => {
  it("downloads an uploaded attachment for the owning requester", async () => {
    const uploadRes = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("x-requester-id", String(requesterAId))
      .attach("file", Buffer.from("download me"), "download-test.txt");

    const attachmentId = uploadRes.body.id;

    const downloadRes = await request(app)
      .get(`/api/tickets/${ticketId}/attachments/${attachmentId}`)
      .set("x-requester-id", String(requesterAId));

    expect(downloadRes.status).toBe(200);
    expect(downloadRes.text).toBe("download me");
  });

  it("soft-removes an attachment and it no longer appears in ticket detail", async () => {
    const uploadRes = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("x-requester-id", String(requesterAId))
      .attach("file", Buffer.from("to be removed"), "remove-test.txt");

    const attachmentId = uploadRes.body.id;

    const deleteRes = await request(app)
      .delete(`/api/tickets/${ticketId}/attachments/${attachmentId}`)
      .set("x-requester-id", String(requesterAId));

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.isRemoved).toBe(true);

    const detailRes = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set("x-requester-id", String(requesterAId));

    const stillPresent = detailRes.body.attachments.some(
      (a: { id: number }) => a.id === attachmentId
    );
    expect(stillPresent).toBe(false);
  });

  it("returns 404 when downloading a removed attachment", async () => {
    const uploadRes = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("x-requester-id", String(requesterAId))
      .attach("file", Buffer.from("gone soon"), "gone.txt");

    const attachmentId = uploadRes.body.id;

    await request(app)
      .delete(`/api/tickets/${ticketId}/attachments/${attachmentId}`)
      .set("x-requester-id", String(requesterAId));

    const downloadRes = await request(app)
      .get(`/api/tickets/${ticketId}/attachments/${attachmentId}`)
      .set("x-requester-id", String(requesterAId));

    expect(downloadRes.status).toBe(404);
  });
});