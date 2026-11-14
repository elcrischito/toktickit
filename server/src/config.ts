// Runtime settings read from the environment (Lab 5, R-02).
// Every variable here is documented in server/.env.example and docs/labs/lab-05/deployment.md.

export const isProduction = () => process.env.NODE_ENV === "production";

// Local/dev fallback only. In production the secret MUST come from the environment
// (Cloud Run reads it from Secret Manager), otherwise anyone who reads this public
// repository could forge login tokens.
const DEV_JWT_SECRET = "dev-only-jwt-secret-not-for-production";

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length > 0) return secret;
  if (isProduction()) {
    throw new Error("JWT_SECRET must be set when NODE_ENV=production");
  }
  return DEV_JWT_SECRET;
}

// Fail fast at start-up instead of on the first login.
export function assertProductionConfig(): void {
  if (!isProduction()) return;
  const missing = ["DATABASE_URL", "JWT_SECRET"].filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables in production: ${missing.join(", ")}`);
  }
}
