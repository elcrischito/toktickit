import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("GET /api/dev-requesters", () => {
  it("returns only active development requesters", async () => {
    const res = await request(app).get("/api/dev-requesters");
    expect(res.status).toBe(200);
    const names = res.body.map((r: { name: string }) => r.name);
    expect(names).toContain("Jennifer Anderson");
    expect(names).toContain("Michael Brown");
    expect(names).toContain("Sarah Johnson");
    expect(names).toContain("David Lee");
    expect(names).not.toContain("Robert Wilson");
  });

  it("returns requesters with id, name, and email fields only", async () => {
    const res = await request(app).get("/api/dev-requesters");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    const first = res.body[0];
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("name");
    expect(first).toHaveProperty("email");
  });
});