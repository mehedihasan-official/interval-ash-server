import { NextFunction, Request, Response } from 'express';
import { UserModel } from '../models/user.model';
import { catchAsync } from '../utils/catch-async';
import { AppError } from '../utils/app-error';

/**
 * Gate for admin-only mutations (creating/editing/deleting resorts, etc).
 *
 * This project's admin status lives entirely in the `User` collection
 * (`isAdmin`, set via PATCH /api/update-user) rather than behind a full
 * server-side session or a verified Firebase ID token — the client's
 * AuthProvider already treats that field as the source of truth for who
 * is an admin, so this middleware checks the exact same field instead of
 * introducing a second, inconsistent notion of "admin".
 *
 * The caller identifies themselves via the `x-user-email` header, which
 * the frontend sets from the signed-in Firebase user's email on every
 * admin request (see lib/api/admin.ts). This stops a logged-out visitor,
 * or a logged-in non-admin member, from hitting the resort write
 * endpoints directly — it is not a substitute for verifying a signed
 * Firebase ID token, which would be the next hardening step if this
 * project adds firebase-admin later.
 */
export const requireAdmin = catchAsync(
  async (req: Request, _res: Response, next: NextFunction) => {
    const emailHeader = req.headers['x-user-email'];
    const email = Array.isArray(emailHeader) ? emailHeader[0] : emailHeader;

    if (!email || !email.trim()) {
      throw new AppError('Sign in as an admin to do this.', 401);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const requestingUser = await UserModel.findOne({ email: normalizedEmail });

    if (!requestingUser || !requestingUser.isAdmin) {
      throw new AppError('Only admins can perform this action.', 403);
    }

    next();
  }
);
