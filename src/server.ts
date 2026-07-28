import { createApp } from './app';
import { env } from './config/env';
import { connectToDatabase, disconnectFromDatabase } from './config/database';

/**
 * Application bootstrap.
 * Connects to the database FIRST, then starts the HTTP server — this
 * avoids accepting requests before the database is actually reachable.
 */
async function startServer(): Promise<void> {
  await connectToDatabase();

  const app = createApp();

  const server = app.listen(env.port, () => {
    console.log(`Server is running on port ${env.port} [${env.nodeEnv}]`);
  });

  /**
   * Gracefully shuts the server down: stops accepting new connections,
   * closes the database connection, then exits the process.
   * Handles both Ctrl+C (SIGINT) and process managers' stop signal (SIGTERM).
   */
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectFromDatabase();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
