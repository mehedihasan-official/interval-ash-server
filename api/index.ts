import type { IncomingMessage, ServerResponse } from "http";
import { createApp } from "../src/app";
import { connectToDatabase } from "../src/config/database";

// Build the Express app once per cold start and reuse it across warm
// invocations (module-level state persists between invocations on the
// same Lambda instance). This is safe now that env.ts validates
// MONGODB_URI lazily (see src/config/env.ts) — importing createApp no
// longer has any risk of throwing before our try/catch below can run.
const app = createApp();

/**
 * Vercel serverless entrypoint.
 *
 * IMPORTANT: this must connect to MongoDB before handling any request —
 * unlike src/server.ts (used for local/traditional hosting), nothing
 * here runs connectToDatabase() automatically on process start, because
 * there is no long-lived "start" step in a serverless function.
 *
 * Connection failures are caught here and turned into a normal JSON 500
 * response instead of throwing — this, together with removing the
 * process.exit(1) that used to live in connectToDatabase(), is what
 * fixes Vercel's FUNCTION_INVOCATION_FAILED crash page: previously an
 * unhandled error (or a missing-env-var throw at import time) crashed
 * the whole function instead of being handled gracefully.
 */
export default async function (req: IncomingMessage, res: ServerResponse) {
  try {
    const requestPath = req.url?.split("?")[0] || "/";
    if (requestPath.startsWith("/api/")) {
      await connectToDatabase();
    }
    app(req as never, res as never);
    return undefined;
  } catch (error) {
    console.error("Serverless function failed to initialize:", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: false,
          message: "Internal Server Error",
        }),
      );
    }
    return undefined;
  }
}
