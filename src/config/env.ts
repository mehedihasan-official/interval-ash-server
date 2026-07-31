import dotenv from "dotenv";

dotenv.config();

/**
 * A single, typed source of truth for all environment variables.
 *
 * Reading `process.env` directly throughout the codebase is error-prone
 * (typos, missing values, no defaults). Instead, every other file imports
 * this `env` object, so required variables are validated in one place.
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,

  // A lazy getter, not a plain property: reading `env.mongodbUri` is what
  // triggers validation, not importing this module. This matters for the
  // Vercel serverless entrypoint (api/index.ts) — importing `env` (even
  // indirectly, via app.ts) must never throw, or it crashes the whole
  // function before our try/catch around connectToDatabase() can turn a
  // missing/misconfigured MONGODB_URI into a clean JSON 500 response
  // instead of Vercel's generic FUNCTION_INVOCATION_FAILED page.
  get mongodbUri(): string {
    return requireEnv("MONGODB_URI");
  },

  // Node's default DNS resolver can reject MongoDB Atlas SRV lookups on
  // some local networks. Allow the resolver to be configured without
  // changing the MongoDB connection string.
  dnsServers: (process.env.DNS_SERVERS || "8.8.8.8,8.8.4.4")
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean),

  clientOrigins: (process.env.CLIENT_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};

export const isProduction = env.nodeEnv === "production";
