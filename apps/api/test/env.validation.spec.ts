import { validateEnv } from "../src/config/env.validation";

describe("validateEnv", () => {
  const base = {
    NODE_ENV: "development",
    DATABASE_URL: "postgresql://localhost/flowos",
    REDIS_URL: "redis://localhost:6379",
    JWT_ACCESS_SECRET: "dev-only-not-for-production-use-32chars",
    JWT_REFRESH_SECRET: "dev-only-not-for-production-use-32chars"
  };

  it("aceita env de desenvolvimento", () => {
    expect(() => validateEnv(base)).not.toThrow();
  });

  it("rejeita segredos fracos em producao", () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: "production",
        JWT_ACCESS_SECRET: "change-me-access",
        CORS_ORIGINS: "https://app.example.com",
        EVOLUTION_API_URL: "http://evo:8080",
        EVOLUTION_API_KEY: "real-key-with-enough-length-32chars",
        EVOLUTION_WEBHOOK_SECRET: "real-webhook-secret-32chars-minimum",
        PUBLIC_WEB_URL: "https://app.example.com"
      })
    ).toThrow(/JWT_ACCESS_SECRET/);
  });
});
