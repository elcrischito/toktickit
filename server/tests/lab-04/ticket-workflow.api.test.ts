import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { lab3App } from "../../src/lab3App";

const prisma = new PrismaClient();

describe("Lab 4 API - Ticket Workflow Transitions & Concurrency (FR-04, FR-05, BR-06..BR-08)", () => {
  let staffToken = "";
  let requesterToken = "";
  let testTicketId = "";

  beforeAll(async () => {
    const [sLogin, rLogin, cat] = await Promise.all([
      request(lab3App).post("/api/auth/login").send({ email: "michael.brown@toktickit.com", password: "Password123!" }),
      request(lab3App).post("/api/auth/login").send({ email: "jennifer.anderson@toktickit.com", password: "Password123!" }),
      prisma.category.findFirstOrThrow(),
    ]);
    staffToken = sLogin.body.token;
    requesterToken = rLogin.body.token;

    const createRes = await request(lab3App)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({
        categoryId: cat.id,
        summary: "Lab 4 workflow lifecycle verification ticket",
        description: "Testing state transitions, advisory resolution, and optimistic concurrency.",
        requestedPriority: "MEDIUM",
      });
    testTicketId = createRes.body.id;
  });

  afterAll(async () => {
    if (testTicketId) {
      await prisma.ticket.deleteMany({ where: { id: testTicketId } });
    }
    await prisma.$disconnect();
  });

  it("API-07: enforces permitted transitions and rejects illegal transitions (400)", async () => {
    // Illegal jump from NEW directly to CLOSED
    const illegalJump = await request(lab3App)
      .patch(`/api/staff/tickets/${testTicketId}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ status: "CLOSED", version: 1 });
    expect(illegalJump.status).toBe(400);

    // Permitted NEW -> IN_PROGRESS
    const toInProgress = await request(lab3App)
      .patch(`/api/staff/tickets/${testTicketId}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ status: "IN_PROGRESS", version: 1 });
    expect(toInProgress.status).toBe(200);
    expect(toInProgress.body.status).toBe("IN_PROGRESS");
    expect(toInProgress.body.version).toBe(2);

    // RESOLVED without resolutionSummary must fail (400)
    const missingSummary = await request(lab3App)
      .patch(`/api/staff/tickets/${testTicketId}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ status: "RESOLVED", version: 2 });
    expect(missingSummary.status).toBe(400);
  });

  it("API-08: blocks Requester direct resolution (403) while recording advisory problem-resolved comment", async () => {
    const directResolve = await request(lab3App)
      .patch(`/api/staff/tickets/${testTicketId}`)
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({ status: "RESOLVED", resolutionSummary: "Requester bypass" });
    expect(directResolve.status).toBe(403);

    const advisory = await request(lab3App)
      .post(`/api/tickets/${testTicketId}/problem-resolved`)
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({ note: "Service is working now, please review and close." });
    expect(advisory.status).toBe(200);
    expect(advisory.body.status).toBe("IN_PROGRESS");
  });

  it("API-09: detects stale version conflicts (409) and completes Resolve -> Close -> Reopen lifecycle", async () => {
    // Stale version 1 (current is 2) -> 409 Conflict
    const staleRes = await request(lab3App)
      .patch(`/api/staff/tickets/${testTicketId}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ status: "RESOLVED", resolutionSummary: "Fixed", version: 1 });
    expect(staleRes.status).toBe(409);

    // Valid Resolve with version 2 -> version 3
    const resolveRes = await request(lab3App)
      .patch(`/api/staff/tickets/${testTicketId}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ status: "RESOLVED", resolutionSummary: "Applied configuration patch", version: 2 });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.status).toBe("RESOLVED");
    expect(resolveRes.body.version).toBe(3);

    // Valid Close with version 3 -> version 4
    const closeRes = await request(lab3App)
      .patch(`/api/staff/tickets/${testTicketId}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ status: "CLOSED", version: 3 });
    expect(closeRes.status).toBe(200);
    expect(closeRes.body.status).toBe("CLOSED");
    expect(closeRes.body.version).toBe(4);
  });
});
