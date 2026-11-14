import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import { lab3App } from "../../src/lab3App";
import { getJwtSecret, assertProductionConfig } from "../../src/config";

// Lab 5 (Student Guide Episode 2): checks that matter once the app runs on Cloud Run.
const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});

describe("Lab 5 - cloud readiness", () => {
  it("GET /api/ready reports the database as connected", async () => {
    const res = await request(lab3App).get("/api/ready");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ready", db: "connected" });
  });

  it("unknown /api routes return JSON 404, not the web page", async () => {
    const res = await request(lab3App).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Not found" });
  });

  it("refuses to run in production without JWT_SECRET (no hard-coded signing key)", () => {
    process.env.NODE_ENV = "production";
    delete process.env.JWT_SECRET;
    expect(() => getJwtSecret()).toThrow(/JWT_SECRET/);
    expect(() => assertProductionConfig()).toThrow(/JWT_SECRET/);
  });

  it("uses JWT_SECRET from the environment when it is set", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "from-secret-manager";
    process.env.DATABASE_URL = "postgresql://example";
    expect(getJwtSecret()).toBe("from-secret-manager");
    expect(() => assertProductionConfig()).not.toThrow();
  });
});
