/**
 * A custom error class that carries an HTTP status code alongside the
 * message. Controllers/services throw this for expected failure cases
 * (e.g. "resort not found" -> 404), and the global error handler
 * middleware (see src/middlewares/error-handler.ts) reads `statusCode`
 * to build the correct response instead of always returning 500.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Distinguishes expected errors from bugs

    // Maintains proper stack trace (excluding constructor call)
    Error.captureStackTrace(this, this.constructor);
  }
}
