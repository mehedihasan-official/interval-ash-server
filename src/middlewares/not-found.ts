import { Request, Response } from 'express';

/**
 * Catch-all handler for any request that doesn't match a defined route.
 * Must be registered after all other routes in server.ts.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}
