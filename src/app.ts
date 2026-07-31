import cors from "cors";
import express, { Application, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { env, isProduction } from "./config/env";
import { globalErrorHandler } from "./middlewares/error-handler";
import { notFoundHandler } from "./middlewares/not-found";
import apiRouter from "./routes";

/**
 * Builds and configures the Express application.
 * Kept separate from server.ts so the app can be imported in tests
 * without actually starting a listening server.
 */
export function createApp(): Application {
  const app = express();

  // Vercel forwards the original client IP in X-Forwarded-For.
  app.set("trust proxy", 1);

  // ---------- Security & Utility Middleware ----------
  app.use(helmet()); // Sets safe HTTP headers
  app.use(
    cors({
      // If no origins are configured, allow all (useful in early development).
      origin: env.clientOrigins.length > 0 ? env.clientOrigins : "*",
    }),
  );
  app.use(express.json()); // Parses incoming JSON request bodies

  // Request logging: concise in production, detailed in development.
  app.use(morgan(isProduction ? "combined" : "dev"));

  // Basic rate limiting to protect against abuse/brute-force requests.
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      limit: 300, // Max requests per IP per window
      keyGenerator: (req) =>
        req.ip ||
        req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
        req.socket.remoteAddress ||
        "unknown",
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // ---------- Root Health Check ----------
  app.get("/", (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: "Interval Ash Server is running",
    });
  });

  // ---------- API Routes ----------
  app.use("/api", apiRouter);

  // ---------- Error Handling (must be last) ----------
  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
}
