import { Response } from 'express';
import { ApiSuccessResponse } from '../types/api-response';

/**
 * Sends a consistently-shaped success response.
 *
 * Every successful endpoint in this API responds with the same envelope
 * ({ success, message, data }), so the frontend can handle responses the
 * same way regardless of which route it called.
 */
export function sendResponse<T>(
  res: Response,
  statusCode: number,
  message: string,
  data: T
): void {
  const response: ApiSuccessResponse<T> = {
    success: true,
    message,
    data,
  };
  res.status(statusCode).json(response);
}
