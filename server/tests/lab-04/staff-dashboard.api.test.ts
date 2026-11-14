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

    const staffRes = await request(lab3App)
      .get("/api/dashboard/staff")
      .set("Authorization", `Bearer ${staffToken}`);
    expect(staffRes.status).toBe(200);
    expect(staffRes.body.userSummary).toBeUndefined();
    expect(typeof staffRes.body.metrics.newCount).toBe("number");
    expect(typeof staffRes.body.metrics.unassignedCount).toBe("number");
    expect(staffRes.body.metrics.myAssignedCount).toBeGreaterThanOrEqual(2);
    expect(staffRes.body.metrics.myActionsCount).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(staffRes.body.recentTickets)).toBe(true);
    expect(Array.isArray(staffRes.body.myRecentActions)).toBe(true);

    const adminRes = await request(lab3App)
      .get("/api/dashboard/staff")
      .set("Authorization", `Bearer ${adminToken}`);
    const dbUsers = await prisma.user.count();
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.userSummary.totalUsers).toBe(dbUsers);
  });
});
