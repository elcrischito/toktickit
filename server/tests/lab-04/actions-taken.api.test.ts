import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { lab3App } from "../../src/lab3App";

const prisma = new PrismaClient();

describe("Lab 4 API - Actions Taken (FR-01..FR-03, BR-01..BR-05, BR-08)", () => {
  let staff1Token = "";
  let requester1Token = "";
  let staff1Id = "";
  let staff2Id = "";
  let inactiveStaffId = "";
  let requester1Id = "";
  let ticket1Id = "";
  let ticket2Id = "";
  let createdActionId = "";

  beforeAll(async () => {
    const [s1Login, r1Login, s2User, inactiveUser, r1User, t1, t2] = await Promise.all([
      request(lab3App).post("/api/auth/login").send({ email: "michael.brown@toktickit.com", password: "Password123!" }),
      request(lab3App).post("/api/auth/login").send({ email: "jennifer.anderson@toktickit.com", password: "Password123!" }),
      prisma.user.findUniqueOrThrow({ where: { email: "sarah.johnson@toktickit.com" } }),
      prisma.user.findUniqueOrThrow({ where: { email: "kevin.patel@toktickit.com" } }),
      prisma.user.findUniqueOrThrow({ where: { email: "jennifer.anderson@toktickit.com" } }),
      prisma.ticket.findUniqueOrThrow({ where: { ticketNumber: "TKT-2026-001234" } }),
      prisma.ticket.findUniqueOrThrow({ where: { ticketNumber: "TKT-2026-001235" } }),
    ]);

    staff1Token = s1Login.body.token;
    staff1Id = s1Login.body.user.id;
    requester1Token = r1Login.body.token;
    staff2Id = s2User.id;
    inactiveStaffId = inactiveUser.id;
    requester1Id = r1User.id;
    ticket1Id = t1.id;
    ticket2Id = t2.id;
  });

  afterAll(async () => {
    if (createdActionId) {
      await prisma.actionTaken.deleteMany({ where: { id: createdActionId } });
    }
    await prisma.$disconnect();
  });

  it("API-01: allows Requester to read Actions Taken on owned Ticket and blocks unowned Ticket (403)", async () => {
    const ownRes = await request(lab3App)
      .get(`/api/tickets/${ticket1Id}/actions`)
      .set("Authorization", `Bearer ${requester1Token}`);
    expect(ownRes.status).toBe(200);
    expect(Array.isArray(ownRes.body.actions)).toBe(true);
    expect(ownRes.body.actions.length).toBeGreaterThanOrEqual(2);

    const otherRes = await request(lab3App)
      .get(`/api/tickets/${ticket2Id}/actions`)
      .set("Authorization", `Bearer ${requester1Token}`);
    expect(otherRes.status).toBe(403);
  });

  it("API-02: blocks Requester from creating or updating Actions Taken (403)", async () => {
    const postRes = await request(lab3App)
      .post(`/api/tickets/${ticket1Id}/actions`)
      .set("Authorization", `Bearer ${requester1Token}`)
      .send({ description: "Unauthorized attempt", result: "Blocked" });
    expect(postRes.status).toBe(403);

    const patchRes = await request(lab3App)
      .patch(`/api/tickets/${ticket1Id}/actions/00000000-0000-4000-8000-000000000001`)
      .set("Authorization", `Bearer ${requester1Token}`)
      .send({ status: "CANCELLED" });
    expect(patchRes.status).toBe(403);
  });

  it("API-03: creates Action Taken under Ticket with auto-attributed performer and active assignee (201)", async () => {
    const res = await request(lab3App)
      .post(`/api/tickets/${ticket1Id}/actions`)
      .set("Authorization", `Bearer ${staff1Token}`)
      .send({
        actionDateTime: "2026-11-14T10:00:00.000Z",
        description: "Verified thermal sensors and updated BIOS firmware",
        result: "CPU idle temperature stabilized at 41C",
        status: "IN_PROGRESS",
        performedById: staff2Id, // Must be ignored in favor of authenticated staff1Id
        assignedToId: staff2Id,
        followUpRequired: true,
        followUpNote: "Confirm battery drain after 24h cycle",
        attachmentNotes: "bios-update-log.txt",
      });

    expect(res.status).toBe(201);
    expect(res.body.ticketId).toBe(ticket1Id);
    expect(res.body.performedById).toBe(staff1Id);
    expect(res.body.assignedToId).toBe(staff2Id);
    expect(res.body.version).toBe(1);
    createdActionId = res.body.id;
  });

  it("API-04: rejects Action Taken when followUpRequired=true and followUpNote is blank (400)", async () => {
    const res = await request(lab3App)
      .post(`/api/tickets/${ticket1Id}/actions`)
      .set("Authorization", `Bearer ${staff1Token}`)
      .send({
        description: "Attempt follow-up without note",
        result: "Pending",
        followUpRequired: true,
        followUpNote: "   ",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Follow-up Note/i);
  });

  it("API-05: rejects inactive staff or Requester as assignedToId (400)", async () => {
    const inactiveRes = await request(lab3App)
      .post(`/api/tickets/${ticket1Id}/actions`)
      .set("Authorization", `Bearer ${staff1Token}`)
      .send({
        description: "Assign to inactive agent",
        result: "Should fail",
        assignedToId: inactiveStaffId,
      });
    expect(inactiveRes.status).toBe(400);

    const requesterRes = await request(lab3App)
      .post(`/api/tickets/${ticket1Id}/actions`)
      .set("Authorization", `Bearer ${staff1Token}`)
      .send({
        description: "Assign to requester",
        result: "Should fail",
        assignedToId: requester1Id,
      });
    expect(requesterRes.status).toBe(400);
  });

  it("API-06: updates Action Taken status and enforces optimistic concurrency version check (409)", async () => {
    const updateRes = await request(lab3App)
      .patch(`/api/tickets/${ticket1Id}/actions/${createdActionId}`)
      .set("Authorization", `Bearer ${staff1Token}`)
      .send({
        status: "COMPLETED",
        result: "Completed 24h cycle with normal battery curve",
        version: 1,
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.status).toBe("COMPLETED");
    expect(updateRes.body.version).toBe(2);

    const conflictRes = await request(lab3App)
      .patch(`/api/tickets/${ticket1Id}/actions/${createdActionId}`)
      .set("Authorization", `Bearer ${staff1Token}`)
      .send({
        status: "CANCELLED",
        version: 1, // Stale version
      });

    expect(conflictRes.status).toBe(409);
  });
});
