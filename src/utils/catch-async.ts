import { NextFunction, Request, Response } from 'express';

type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

/**
 * Wraps an async Express route handler so that any rejected promise
 * (thrown error) is automatically forwarded to `next()`, which routes it
 * to the global error handler middleware.
 *
 * Without this, every controller would need its own try/catch block that
 * calls `next(error)` manually. Wrapping the handler once here keeps
 * every controller function short and focused on its actual logic.
 *
 * Usage: router.get('/', catchAsync(myController));
 */
export function catchAsync(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}
