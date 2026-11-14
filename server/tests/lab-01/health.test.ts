import { describe, it, expect } from "vitest";
import request from "supertest";
import { lab3App } from "../../src/lab3App";

// Lab 1 worked example, now pointed at the live app (lab3App) instead of the
// retired Lab 1/2 src/app.ts.
describe("GET /api/health", () => {
  it("returns 200 with status ok and the service name", async () => {
    const res = await request(lab3App).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok", service: "TokTickIT API" });
  });
});
