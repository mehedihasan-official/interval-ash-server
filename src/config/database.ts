import mongoose from "mongoose";
import dns from "node:dns";
import { env } from "./env";

/**
 * Connects to MongoDB using Mongoose.
 *
 * Caches the connection promise on `global` so that warm serverless
 * invocations (Vercel) reuse the existing connection instead of opening
 * a new one on every request — opening a fresh connection per request
 * is slow and quickly exhausts MongoDB's connection limit. In a
 * long-running process (local dev, traditional server) this cache is
 * just a harmless no-op memoization.
 */
declare global {
  var __mongooseConnectionPromise: Promise<typeof mongoose> | undefined;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (!global.__mongooseConnectionPromise) {
    // Only override the DNS resolver when explicitly configured (useful
    // on some local networks where the default resolver can't complete
    // MongoDB Atlas's SRV lookup). Never do this unconditionally: on
    // Vercel this forces DNS queries through a resolver Vercel's network
    // wasn't asked to allow, which can fail in ways that are much harder
    // to diagnose than a normal connection error.
    if (process.env.DNS_SERVERS) {
      dns.setServers(env.dnsServers);
    }

    global.__mongooseConnectionPromise = mongoose
      .connect(env.mongodbUri, {
        dbName: "intervalAsh",
        // Fail fast instead of hanging until Vercel's function timeout —
        // a clear connection error is much easier to diagnose than a
        // generic FUNCTION_INVOCATION_FAILED from a timed-out request.
        serverSelectionTimeoutMS: 8000,
      })
      .then((conn) => {
        console.log("MongoDB connected successfully.");
        return conn;
      })
      .catch((error) => {
        // Reset the cache so the NEXT request retries the connection
        // instead of permanently reusing a rejected promise.
        global.__mongooseConnectionPromise = undefined;
        console.error("MongoDB connection failed:", error);
        throw error;
      });
  }

  return global.__mongooseConnectionPromise;
}

/**
 * Gracefully closes the MongoDB connection.
 * Used during server shutdown (SIGINT / SIGTERM handlers in server.ts).
 * Not used in the serverless entrypoint — Vercel manages the process
 * lifecycle itself, and closing the shared connection there would break
 * other warm invocations still using it.
 */
export async function disconnectFromDatabase(): Promise<void> {
  await mongoose.disconnect();
  global.__mongooseConnectionPromise = undefined;
  console.log("MongoDB connection closed.");
}
