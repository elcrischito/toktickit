import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { lab3App } from "../../src/lab3App";

const prisma = new PrismaClient();

describe("Lab 4 API - IT Staff & Admin Dashboard (FR-06, BR-09)", () => {
  let staffToken = "";
  let staffId = "";
  let adminToken = "";
  let requesterToken = "";

  beforeAll(async () => {
    const [sLogin, aLogin, rLogin] = await Promise.all([
      request(lab3App).post("/api/auth/login").send({ email: "michael.brown@toktickit.com", password: "Password123!" }),
      request(lab3App).post("/api/auth/login").send({ email: "admin@toktickit.com", password: "Password123!" }),
      request(lab3App).post("/api/auth/login").send({ email: "jennifer.anderson@toktickit.com", password: "Password123!" }),
    ]);
    staffToken = sLogin.body.token;
    staffId = sLogin.body.user.id;
    adminToken = aLogin.body.token;
    requesterToken = rLogin.body.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("API-11: returns authoritative DB counts for IT Staff & Admin and blocks Requester (403)", async () => {
    const forbidden = await request(lab3App)
      .get("/api/dashboard/staff")
      .set("Authorization", `Bearer ${requesterToken}`);
    expect(forbidden.status).toBe(403);

    const [staffRes, adminRes, dbNew, dbOpen, dbInProgress, dbWaiting, dbUnassigned, dbMyAssigned, dbHigh, dbMyActions, dbUsers] =
      await Promise.all([
        request(lab3App).get("/api/dashboard/staff").set("Authorization", `Bearer ${staffToken}`),
        request(lab3App).get("/api/dashboard/staff").set("Authorization", `Bearer ${adminToken}`),
        prisma.ticket.count({ where: { status: "NEW" } }),
        prisma.ticket.count({ where: { status: "OPEN" } }),
        prisma.ticket.count({ where: { status: "IN_PROGRESS" } }),
        prisma.ticket.count({ where: { status: "WAITING_FOR_REQUESTER" } }),
        prisma.ticket.count({ where: { ownerId: null, status: { notIn: ["CLOSED", "CANCELLED"] } } }),
        prisma.ticket.count({ where: { ownerId: staffId, status: { notIn: ["CLOSED", "CANCELLED"] } } }),
        prisma.ticket.count({ where: { itPriority: "HIGH", status: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] } } }),
        prisma.actionTaken.count({ where: { OR: [{ performedById: staffId }, { assignedToId: staffId }] } }),
        prisma.user.count(),
      ]);

    expect(staffRes.status).toBe(200);
    expect(staffRes.body.userSummary).toBeUndefined();
    expect(staffRes.body.metrics).toEqual({
      newCount: dbNew,
      openCount: dbOpen,
      inProgressCount: dbInProgress,
      waitingForRequesterCount: dbWaiting,
      unassignedCount: dbUnassigned,
      myAssignedCount: dbMyAssigned,
      highPriorityOpenCount: dbHigh,
      myActionsCount: dbMyActions,
    });

    expect(adminRes.status).toBe(200);
    expect(adminRes.body.userSummary.totalUsers).toBe(dbUsers);
  });
});
