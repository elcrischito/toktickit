import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { lab3App } from "../../src/lab3App";

const prisma = new PrismaClient();

describe("Lab 4 API - Requester Dashboard (FR-07, BR-09)", () => {
  let req1Token = "";
  let req1Id = "";

  beforeAll(async () => {
    const login = await request(lab3App)
      .post("/api/auth/login")
      .send({ email: "jennifer.anderson@toktickit.com", password: "Password123!" });
    req1Token = login.body.token;
    req1Id = login.body.user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("API-10: returns metrics and tickets strictly scoped to authenticated Requester matching DB counts", async () => {
    const [res, dbOpen, dbInProgress, dbWaiting, dbResolved, dbClosed] = await Promise.all([
      request(lab3App).get("/api/dashboard/requester").set("Authorization", `Bearer ${req1Token}`),
      prisma.ticket.count({
        where: { requesterId: req1Id, status: { in: ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"] } },
      }),
      prisma.ticket.count({ where: { requesterId: req1Id, status: "IN_PROGRESS" } }),
      prisma.ticket.count({ where: { requesterId: req1Id, status: "WAITING_FOR_REQUESTER" } }),
      prisma.ticket.count({ where: { requesterId: req1Id, status: "RESOLVED" } }),
      prisma.ticket.count({ where: { requesterId: req1Id, status: "CLOSED" } }),
    ]);

    expect(res.status).toBe(200);
    expect(res.body.metrics).toEqual({
      myOpenCount: dbOpen,
      inProgressCount: dbInProgress,
      waitingForMeCount: dbWaiting,
      resolvedCount: dbResolved,
      closedCount: dbClosed,
    });

    for (const t of res.body.recentTickets) {
      expect(t.requesterId).toBe(req1Id);
    }
    for (const t of res.body.attentionTickets) {
      expect(t.requesterId).toBe(req1Id);
    }
  });
});
