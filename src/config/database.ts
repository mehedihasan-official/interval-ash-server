import mongoose from "mongoose";
import { env } from "./env";

/**
 * Connects to MongoDB using Mongoose.
 *
 * Called once when the server starts (see src/server.ts). If the initial
 * connection fails, the process exits — there is no point serving requests
 * without a working database.
 */
export async function connectToDatabase(): Promise<void> {
  try {
    await mongoose.connect(env.mongodbUri, {
      dbName: "intervalAsh",
    });
    console.log("MongoDB connected successfully.");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
}

/**
 * Gracefully closes the MongoDB connection.
 * Used during server shutdown (SIGINT / SIGTERM handlers in server.ts).
 */
export async function disconnectFromDatabase(): Promise<void> {
  await mongoose.disconnect();
  console.log("MongoDB connection closed.");
}
