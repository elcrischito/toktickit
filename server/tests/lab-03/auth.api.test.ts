import { describe, it, expect } from "vitest";
import request from "supertest";
import { lab3App } from "../../src/lab3App";

// Uses supertest against lab3App directly, so these tests no longer need a
// dev server running on port 5000.
describe("Lab 3 - Authentication & Authorization APIs", () => {
  it("should reject login with invalid credentials", async () => {
    const res = await request(lab3App)
      .post("/api/auth/login")
      .send({ email: "invalid@toktickit.com", password: "wrongpassword" });
    expect(res.status).toBe(401);
  });

  it("should require authentication token for protected endpoint", async () => {
    const res = await request(lab3App).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});
