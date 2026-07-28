/**
 * Standard shape for every successful API response.
 * Keeping this consistent makes the frontend's response handling predictable.
 */
export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

/**
 * Standard shape for every error API response.
 */
export interface ApiErrorResponse {
  success: false;
  message: string;
}
