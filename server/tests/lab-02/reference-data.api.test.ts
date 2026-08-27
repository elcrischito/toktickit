import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("GET /api/related-systems", () => {
  it("returns the seeded active related systems", async () => {
    const res = await request(app).get("/api/related-systems");
    expect(res.status).toBe(200);
    const names = res.body.map((s: { name: string }) => s.name);
    expect(names).toContain("Email");
    expect(names).toContain("Campus Wi-Fi");
    expect(names).toContain("VPN");
    expect(names).toContain("Corporate Laptop");
    expect(res.body.length).toBeGreaterThanOrEqual(6);
  });

  it("returns systems with id and name fields only", async () => {
    const res = await request(app).get("/api/related-systems");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty("id");
    expect(res.body[0]).toHaveProperty("name");
  });
});

describe("GET /api/categories (Lab 2 isActive filter)", () => {
  it("still returns the four seeded categories now that isActive filtering is applied", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    expect(res.body.map((c: { name: string }) => c.name)).toEqual([
      "Account and Access",
      "Hardware",
      "Software",
      "Network",
    ]);
  });
});