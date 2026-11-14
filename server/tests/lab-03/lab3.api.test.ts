import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { lab3App } from "../../src/lab3App";

const prisma = new PrismaClient();

describe("Lab 3 - Authentication, RBAC, Ticket Workflow & Admin Safety APIs", () => {
  let staffToken = "";
  let requesterToken = "";
  let adminToken = "";
  let tempAdminId = "";
  const tempUserEmail = `temp.user.${Date.now()}@toktickit.com`;
  const tempAdminEmail = `temp.admin.${Date.now()}@toktickit.com`;
  let createdTicketId = "";

  beforeAll(async () => {
    const hash = await bcrypt.hash("Password123!", 10);

    const tempAdmin = await prisma.user.create({
      data: {
        email: tempAdminEmail,
        fullName: "Test Admin",
        passwordHash: hash,
        role: Role.ADMIN,
        isActive: true,
        mustChangePassword: false,
      },
    });
    tempAdminId = tempAdmin.id;

    const [adminRes, staffRes, reqRes] = await Promise.all([
      request(lab3App).post("/api/auth/login").send({ email: tempAdminEmail, password: "Password123!" }),
      request(lab3App).post("/api/auth/login").send({ email: "michael.brown@toktickit.com", password: "Password123!" }),
      request(lab3App).post("/api/auth/login").send({ email: "jennifer.anderson@toktickit.com", password: "Password123!" }),
    ]);

    adminToken = adminRes.body.token;
    staffToken = staffRes.body.token;
    requesterToken = reqRes.body.token;
  });

  afterAll(async () => {
    if (createdTicketId) {
      await prisma.ticket.deleteMany({ where: { id: createdTicketId } });
    }
    await prisma.user.deleteMany({
      where: { email: { in: [tempUserEmail, tempAdminEmail] } },
    });
    await prisma.$disconnect();
  });

  it("AUTH-01: rejects login with invalid credentials (401)", async () => {
    const res = await request(lab3App)
      .post("/api/auth/login")
      .send({ email: "invalid@toktickit.com", password: "WrongPassword1!" });
    expect(res.status).toBe(401);
  });

  it("AUTH-02: rejects login for inactive user account (BR-01)", async () => {
    const res = await request(lab3App)
      .post("/api/auth/login")
      .send({ email: "brian.inactive@toktickit.com", password: "Password123!" });
    expect(res.status).toBe(401);
  });

  it("AUTH-03: authenticates active IT Staff and returns JWT + user profile (AC-01)", async () => {
    const res = await request(lab3App)
      .post("/api/auth/login")
      .send({ email: "michael.brown@toktickit.com", password: "Password123!" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe("IT_STAFF");
  });

  it("AUTH-04: returns current user via GET /api/auth/me and rejects missing token", async () => {
    const unauth = await request(lab3App).get("/api/auth/me");
    expect(unauth.status).toBe(401);

    const auth = await request(lab3App)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${staffToken}`);
    expect(auth.status).toBe(200);
    expect(auth.body.user.email).toBe("michael.brown@toktickit.com");
  });

  it("ADMIN-01: blocks non-admin users from /api/admin/users with 403", async () => {
    const res = await request(lab3App)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
  });

  it("ADMIN-02: creates user with mustChangePassword=true and enforces password change (AC-02)", async () => {
    const createRes = await request(lab3App)
      .post("/api/admin/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        fullName: "Temporary Tester",
        email: tempUserEmail,
        role: "REQUESTER",
        initialPassword: "InitPass123!",
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.mustChangePassword).toBe(true);

    const loginRes = await request(lab3App)
      .post("/api/auth/login")
      .send({ email: tempUserEmail, password: "InitPass123!" });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.mustChangePassword).toBe(true);

    const changeRes = await request(lab3App)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${loginRes.body.token}`)
      .send({ currentPassword: "InitPass123!", newPassword: "NewStrongPassword1!" });
    expect(changeRes.status).toBe(200);
  });

  it("ADMIN-03: prevents administrator from deactivating their own account (AC-05, BR-06)", async () => {
    const res = await request(lab3App)
      .patch(`/api/admin/users/${tempAdminId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ isActive: false });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/own account/i);
  });

  it("TICKET-01: creates a ticket under authenticated Requester identity (FR-03, BR-03)", async () => {
    const cats = await request(lab3App).get("/api/categories");
    const categoryId = cats.body[0].id;

    const res = await request(lab3App)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({
        categoryId,
        requestedPriority: "HIGH",
        summary: "Automated Lab 3 test ticket",
        description: "Testing authenticated ticket creation and RBAC workflow.",
      });
    expect(res.status).toBe(201);
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    createdTicketId = res.body.id;
  });

  it("TICKET-02: blocks Requester from IT Staff queue (403) and Internal Notes (AC-04)", async () => {
    const queueRes = await request(lab3App)
      .get("/api/staff/tickets")
      .set("Authorization", `Bearer ${requesterToken}`);
    expect(queueRes.status).toBe(403);

    const notesGetRes = await request(lab3App)
      .get(`/api/tickets/${createdTicketId}/notes`)
      .set("Authorization", `Bearer ${requesterToken}`);
    expect(notesGetRes.status).toBe(403);

    const notesPostRes = await request(lab3App)
      .post(`/api/tickets/${createdTicketId}/notes`)
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({ content: "Unauthorized note attempt" });
    expect(notesPostRes.status).toBe(403);
  });

  it("TICKET-03: allows IT Staff to update status/priority, post Internal Notes, and Requester to flag resolved (BR-05)", async () => {
    const patchRes = await request(lab3App)
      .patch(`/api/staff/tickets/${createdTicketId}`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ itPriority: "HIGH", status: "IN_PROGRESS" });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.status).toBe("IN_PROGRESS");

    const noteRes = await request(lab3App)
      .post(`/api/tickets/${createdTicketId}/notes`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ content: "Internal diagnostic note visible only to IT Staff." });
    expect(noteRes.status).toBe(201);

    const resolvedFlagRes = await request(lab3App)
      .post(`/api/tickets/${createdTicketId}/problem-resolved`)
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({ note: "Issue is fixed now." });
    expect(resolvedFlagRes.status).toBe(200);
    expect(resolvedFlagRes.body.status).toBe("IN_PROGRESS");
  });
});
