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
export function globalErrorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const message =
    error instanceof AppError ? error.message : "Internal Server Error";

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
