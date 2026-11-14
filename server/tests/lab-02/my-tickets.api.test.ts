import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";
import { lab3App } from "../../src/lab3App";

// Lab 2 "My Tickets" API rules, migrated from the retired x-requester-id header
// to the Lab 3 JWT session. Two throw-away requesters keep the counts predictable.
const prisma = new PrismaClient();
const stamp = Date.now();
const emailA = `lab2.mytickets.a.${stamp}@toktickit.com`;
const emailB = `lab2.mytickets.b.${stamp}@toktickit.com`;

let tokenA = "";
let tokenB = "";
let hardwareId = "";
let softwareId = "";

async function createTicket(token: string, overrides: Record<string, unknown> = {}) {
  const res = await request(lab3App)
    .post("/api/tickets")
    .set("Authorization", `Bearer ${token}`)
    .send({
      categoryId: hardwareId,
      summary: "Default summary for test ticket",
      description: "Default description long enough to pass validation rules.",
      requestedPriority: "MEDIUM",
      ...overrides,
    });
  expect(res.status).toBe(201);
  return res.body;
}

beforeAll(async () => {
  const hash = await bcrypt.hash("Password123!", 10);
  for (const email of [emailA, emailB]) {
    await prisma.user.create({
      data: { email, fullName: `Lab2 ${email}`, passwordHash: hash, role: Role.REQUESTER, isActive: true, mustChangePassword: false },
    });
  }
  const [a, b] = await Promise.all([
    request(lab3App).post("/api/auth/login").send({ email: emailA, password: "Password123!" }),
    request(lab3App).post("/api/auth/login").send({ email: emailB, password: "Password123!" }),
  ]);
  tokenA = a.body.token;
  tokenB = b.body.token;

  hardwareId = (await prisma.category.findUniqueOrThrow({ where: { name: "Hardware" } })).id;
  softwareId = (await prisma.category.findUniqueOrThrow({ where: { name: "Software" } })).id;

  // Requester A: 12 tickets (enough for 2 pages of 10). Requester B: none.
  await createTicket(tokenA, { summary: "Laptop battery swelling", requestedPriority: "HIGH" });
  await createTicket(tokenA, { summary: "Excel crashes on start", categoryId: softwareId, requestedPriority: "LOW" });
  for (let i = 0; i < 10; i++) {
    await createTicket(tokenA, { summary: `Filler ticket number ${i}` });
  }
});

afterAll(async () => {
  const users = await prisma.user.findMany({ where: { email: { in: [emailA, emailB] } } });
  const ids = users.map((u) => u.id);
  await prisma.ticket.deleteMany({ where: { requesterId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

const listAs = (token: string, query: Record<string, string> = {}) =>
  request(lab3App).get("/api/tickets").query(query).set("Authorization", `Bearer ${token}`);

describe("GET /api/tickets (My Tickets)", () => {
  it("rejects a request with no session (BR-04, now 401 instead of x-requester-id 400)", async () => {
    const res = await request(lab3App).get("/api/tickets");
    expect(res.status).toBe(401);
  });

  it("only returns tickets belonging to the logged-in requester (ownership scoping)", async () => {
    const res = await listAs(tokenA, { pageSize: "50" });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(12);
    const requesterIds = new Set(res.body.tickets.map((t: any) => t.requester.id));
    expect(requesterIds.size).toBe(1);
    expect(res.body.tickets[0].requester.email).toBe(emailA);
  });

  it("filters results by search term matching summary or ticket number", async () => {
    const bySummary = await listAs(tokenA, { search: "battery" });
    expect(bySummary.body.total).toBe(1);
    const ticketNumber = bySummary.body.tickets[0].ticketNumber;

    const byNumber = await listAs(tokenA, { search: ticketNumber });
    expect(byNumber.body.tickets.map((t: any) => t.ticketNumber)).toEqual([ticketNumber]);
  });

  it("filters results by category", async () => {
    const res = await listAs(tokenA, { categoryId: softwareId });
    expect(res.body.total).toBe(1);
    expect(res.body.tickets[0].summary).toBe("Excel crashes on start");
  });

  it("filters results by requestedPriority", async () => {
    const res = await listAs(tokenA, { priority: "HIGH" });
    expect(res.body.total).toBe(1);
    expect(res.body.tickets[0].requestedPriority).toBe("HIGH");
  });

  it("sorts results by createdAt descending by default", async () => {
    const res = await listAs(tokenA, { pageSize: "50" });
    const dates = res.body.tickets.map((t: any) => new Date(t.createdAt).getTime());
    expect([...dates].sort((x, y) => y - x)).toEqual(dates);
  });

  it("paginates with a default page size of 10 (BR-20)", async () => {
    const page1 = await listAs(tokenA);
    expect(page1.body.pageSize).toBe(10);
    expect(page1.body.tickets).toHaveLength(10);
    expect(page1.body.totalPages).toBe(2);

    const page2 = await listAs(tokenA, { page: "2" });
    expect(page2.body.tickets).toHaveLength(2);
  });

  it("falls back to defaults for an invalid page or pageSize (BR-20)", async () => {
    const res = await listAs(tokenA, { page: "-3", pageSize: "7" });
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(10);
  });

  it("returns an empty list (not an error) when a requester has no tickets", async () => {
    const res = await listAs(tokenB);
    expect(res.status).toBe(200);
    expect(res.body.tickets).toEqual([]);
    expect(res.body.total).toBe(0);
  });
});
