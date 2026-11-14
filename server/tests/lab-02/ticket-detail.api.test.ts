import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";
import fs from "fs";
import path from "path";
import { lab3App } from "../../src/lab3App";
import { UPLOAD_DIR } from "../../src/routes/attachments";

// Lab 2 Ticket Detail + Attachment lifecycle (BR-13..BR-18), migrated to the Lab 3
// JWT session and the restored /api/tickets/:id/attachments + /api/attachments routes.
const prisma = new PrismaClient();
const stamp = Date.now();
const emailA = `lab2.detail.a.${stamp}@toktickit.com`;
const emailB = `lab2.detail.b.${stamp}@toktickit.com`;

let tokenA = "";
let tokenB = "";
let staffToken = "";
let ticketId = "";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const upload = (token: string, id: string, buffer: Buffer, filename: string, contentType: string) =>
  request(lab3App)
    .post(`/api/tickets/${id}/attachments`)
    .set(auth(token))
    .attach("file", buffer, { filename, contentType });

beforeAll(async () => {
  const hash = await bcrypt.hash("Password123!", 10);
  for (const email of [emailA, emailB]) {
    await prisma.user.create({
      data: { email, fullName: `Lab2 ${email}`, passwordHash: hash, role: Role.REQUESTER, isActive: true, mustChangePassword: false },
    });
  }
  const [a, b, s] = await Promise.all([
    request(lab3App).post("/api/auth/login").send({ email: emailA, password: "Password123!" }),
    request(lab3App).post("/api/auth/login").send({ email: emailB, password: "Password123!" }),
    request(lab3App).post("/api/auth/login").send({ email: "michael.brown@toktickit.com", password: "Password123!" }),
  ]);
  tokenA = a.body.token;
  tokenB = b.body.token;
  staffToken = s.body.token;

  const category = await prisma.category.findUniqueOrThrow({ where: { name: "Hardware" } });
  const created = await request(lab3App)
    .post("/api/tickets")
    .set(auth(tokenA))
    .send({
      categoryId: category.id,
      summary: "Ticket for detail/attachment tests",
      description: "Description long enough to pass validation rules for testing.",
      requestedPriority: "MEDIUM",
    });
  ticketId = created.body.id;
});

afterAll(async () => {
  const users = await prisma.user.findMany({ where: { email: { in: [emailA, emailB] } } });
  const ids = users.map((u) => u.id);
  // remove the test files written to server/uploads
  const files = await prisma.attachment.findMany({ where: { ticket: { requesterId: { in: ids } } } });
  for (const f of files) fs.rmSync(path.join(UPLOAD_DIR, f.filename), { force: true });
  await prisma.ticket.deleteMany({ where: { requesterId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

describe("GET /api/tickets/:id (Ticket Detail)", () => {
  it("rejects a request with no session", async () => {
    const res = await request(lab3App).get(`/api/tickets/${ticketId}`);
    expect(res.status).toBe(401);
  });

  it("returns full ticket detail for the owning requester", async () => {
    const res = await request(lab3App).get(`/api/tickets/${ticketId}`).set(auth(tokenA));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(ticketId);
    expect(res.body).toHaveProperty("description");
    expect(res.body.category.name).toBe("Hardware");
    expect(res.body.requester.email).toBe(emailA);
    expect(Array.isArray(res.body.attachments)).toBe(true);
  });

  it("returns 404 when a different requester tries to view the ticket (ownership)", async () => {
    const res = await request(lab3App).get(`/api/tickets/${ticketId}`).set(auth(tokenB));
    expect(res.status).toBe(404);
  });

  it("returns 404 for a non-existent ticket id", async () => {
    const res = await request(lab3App).get("/api/tickets/00000000-0000-0000-0000-000000000000").set(auth(tokenA));
    expect(res.status).toBe(404);
  });
});

describe("POST /api/tickets/:id/attachments (Upload)", () => {
  it("rejects a request with no session", async () => {
    const res = await request(lab3App).post(`/api/tickets/${ticketId}/attachments`);
    expect(res.status).toBe(401);
  });

  it("rejects a request with no file", async () => {
    const res = await request(lab3App).post(`/api/tickets/${ticketId}/attachments`).set(auth(tokenA));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("NO_FILE");
  });

  it("rejects an unsupported file type (BR-13)", async () => {
    const res = await upload(tokenA, ticketId, Buffer.from("hello"), "notes.txt", "text/plain");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("UNSUPPORTED_FILE_TYPE");
  });

  it("rejects a file larger than 5 MB (BR-14)", async () => {
    const big = Buffer.alloc(5 * 1024 * 1024 + 1, 0);
    const res = await upload(tokenA, ticketId, big, "huge.png", "image/png");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("FILE_TOO_LARGE");
  });

  it("uploads a file successfully for the owning requester", async () => {
    const res = await upload(tokenA, ticketId, PNG, "screenshot.png", "image/png");
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ ticketId, fileName: "screenshot.png", mimeType: "image/png", isRemoved: false });
  });

  it("rejects an upload from a non-owning requester (BR-18)", async () => {
    const res = await upload(tokenB, ticketId, PNG, "intruder.png", "image/png");
    expect(res.status).toBe(404);
  });

  it("rejects an upload from IT Staff, who can view but not modify attachments (BR-18)", async () => {
    const res = await upload(staffToken, ticketId, PNG, "staff.png", "image/png");
    expect(res.status).toBe(404);
  });

  it("blocks a 6th active attachment (BR-15)", async () => {
    // one already uploaded above → add 4 more to reach the limit of 5
    for (let i = 0; i < 4; i++) {
      const ok = await upload(tokenA, ticketId, PNG, `extra-${i}.png`, "image/png");
      expect(ok.status).toBe(201);
    }
    const res = await upload(tokenA, ticketId, PNG, "one-too-many.png", "image/png");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("ATTACHMENT_LIMIT_REACHED");
  });
});

describe("Attachment download and soft removal (BR-16, BR-17)", () => {
  let attachmentId = "";

  beforeAll(async () => {
    const list = await request(lab3App).get(`/api/tickets/${ticketId}/attachments`).set(auth(tokenA));
    attachmentId = list.body.data.find((a: any) => a.fileName === "screenshot.png").id;
  });

  it("downloads an attachment for the owning requester and for IT Staff", async () => {
    const owner = await request(lab3App).get(`/api/attachments/${attachmentId}/download`).set(auth(tokenA));
    expect(owner.status).toBe(200);
    expect(owner.headers["content-type"]).toContain("image/png");
    expect(owner.headers["content-disposition"]).toContain("screenshot.png");

    const staff = await request(lab3App).get(`/api/attachments/${attachmentId}/download`).set(auth(staffToken));
    expect(staff.status).toBe(200);
  });

  it("returns 404 when another requester tries to download it", async () => {
    const res = await request(lab3App).get(`/api/attachments/${attachmentId}/download`).set(auth(tokenB));
    expect(res.status).toBe(404);
  });

  it("requires a removal reason of 3-200 characters (BR-17)", async () => {
    const res = await request(lab3App).delete(`/api/attachments/${attachmentId}`).set(auth(tokenA)).send({ removalReason: "x" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_REMOVAL_REASON");
  });

  it("soft-removes an attachment: it disappears from Ticket Detail but keeps its record (BR-16)", async () => {
    const res = await request(lab3App)
      .delete(`/api/attachments/${attachmentId}`)
      .set(auth(tokenA))
      .send({ removalReason: "Wrong screenshot attached" });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: attachmentId, isRemoved: true, removalReason: "Wrong screenshot attached" });

    const detail = await request(lab3App).get(`/api/tickets/${ticketId}`).set(auth(tokenA));
    expect(detail.body.attachments.map((a: any) => a.id)).not.toContain(attachmentId);

    const list = await request(lab3App).get(`/api/tickets/${ticketId}/attachments`).set(auth(tokenA));
    const removed = list.body.data.find((a: any) => a.id === attachmentId);
    expect(removed).toMatchObject({ isRemoved: true, removalReason: "Wrong screenshot attached" });
  });

  it("returns 403 ATTACHMENT_REMOVED when downloading a removed attachment", async () => {
    const res = await request(lab3App).get(`/api/attachments/${attachmentId}/download`).set(auth(tokenA));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ATTACHMENT_REMOVED");
  });

  it("returns 409 ALREADY_REMOVED when removing it twice", async () => {
    const res = await request(lab3App)
      .delete(`/api/attachments/${attachmentId}`)
      .set(auth(tokenA))
      .send({ removalReason: "Trying again" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ALREADY_REMOVED");
  });

  it("frees a slot once removed, so a new upload is accepted again (BR-15/BR-16)", async () => {
    const res = await upload(tokenA, ticketId, PNG, "replacement.png", "image/png");
    expect(res.status).toBe(201);
  });
});
