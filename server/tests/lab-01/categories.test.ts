import { describe, it, expect } from "vitest";
import request from "supertest";
import { lab3App } from "../../src/lab3App";

describe("GET /api/categories", () => {
  it("returns the four seeded categories in alphabetical order", async () => {
    const res = await request(lab3App).get("/api/categories");
    expect(res.status).toBe(200);
    // Since Lab 3 ids are UUIDs, so the API sorts by name instead of numeric id.
    expect(res.body.map((c: { name: string }) => c.name)).toEqual([
      "Account and Access",
      "Hardware",
      "Network",
      "Software",
    ]);
  });
});
