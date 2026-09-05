import { NextFunction, Request, Response } from "express";
import { isProduction } from "../config/env";
import { ApiErrorResponse } from "../types/api-response";
import { AppError } from "../utils/app-error";

/**
 * Global error-handling middleware. Express recognizes this as an error
 * handler because it takes four arguments (err, req, res, next).
 *
 * Every `next(error)` call in the app — whether from an explicit throw
 * inside `catchAsync`, or an unexpected bug — ends up here, so this is
 * the single place that decides what error response the client sees.
 *
 * Must be registered LAST, after all routes and the notFoundHandler.
 */
/**
 * Turns the two Mongo/Mongoose failures an admin form can realistically
 * provoke into something worth reading. Without this both arrive as a
 * bare 500 "Internal Server Error", which tells whoever is filling in
 * the form nothing about what to change.
 */
function describeDatabaseError(
  error: Error,
): { statusCode: number; message: string } | null {
  // Unique-index collision — a flight id or airport code already taken.
  if ((error as { code?: number }).code === 11000) {
    const keys = Object.keys(
      (error as { keyValue?: Record<string, unknown> }).keyValue ?? {},
    );
    const field = keys[0];
    return {
      statusCode: 409,
      message: field
        ? `That ${field} is already in use. Pick a different one.`
        : "That record already exists.",
    };
  }

  // Schema validation — report every field at once rather than the first.
  if (error.name === "ValidationError") {
    const errors = (error as unknown as {
      errors?: Record<string, { message?: string }>;
    }).errors;
    const messages = Object.values(errors ?? {})
      .map((entry) => entry?.message)
      .filter(Boolean);
    return {
      statusCode: 400,
      message: messages.length > 0 ? messages.join(" ") : "Invalid data.",
    };
  }

  return null;
}

export function globalErrorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const described = error instanceof AppError ? null : describeDatabaseError(error);
  const statusCode =
    error instanceof AppError ? error.statusCode : described?.statusCode ?? 500;
  const message =
    error instanceof AppError
      ? error.message
      : described?.message ?? "Internal Server Error";

  // Log the full error server-side for debugging, even if we hide
  // details from the client in production.
  console.error("Error:", error);

  const response: ApiErrorResponse = {
    success: false,
    message,
  };

  // In development, it's useful to also see the stack trace in the response.
  if (!isProduction && error.stack) {
    (response as ApiErrorResponse & { stack?: string }).stack = error.stack;
  }

  res.status(statusCode).json(response);
}
