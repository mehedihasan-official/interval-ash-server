import { Request, Response } from 'express';
import { UserModel } from '../models/user.model';
import { catchAsync } from '../utils/catch-async';
import { sendResponse } from '../utils/send-response';
import { AppError } from '../utils/app-error';

/**
 * GET /api/users
 * Fetch every user in the database.
 */
export const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const email = String(req.query.email || '').trim().toLowerCase();

  if (email) {
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    sendResponse(res, 200, 'User retrieved successfully', user);
    return;
  }

  const users = await UserModel.find();
  sendResponse(res, 200, 'Users retrieved successfully', users);
});

/**
 * GET /api/users/:email
 * Fetch a single user by email address.
 */
export const getUserByEmail = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.params;
  const normalizedEmail = String(email).trim().toLowerCase();

  const user = await UserModel.findOne({ email: normalizedEmail });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  sendResponse(res, 200, 'User retrieved successfully', user);
});

/**
 * POST /api/users
 * Create a new user. Rejects duplicate emails.
 */
export const createUser = catchAsync(async (req: Request, res: Response) => {
  const { name, email } = req.body;

  if (!name || !email) {
    throw new AppError('Name and email are required', 400);
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existingUser = await UserModel.findOne({ email: normalizedEmail });
  if (existingUser) {
    sendResponse(res, 200, 'User already exists', existingUser);
    return;
  }

  const newUser = await UserModel.create({
    ...req.body,
    email: normalizedEmail,
    points: 1000,
    cashBalance: 0,
  });
  sendResponse(res, 201, 'User created successfully', newUser);
});

/**
 * PATCH /api/users/role
 * Update a user's admin status. Also aliased at PATCH /api/update-user
 * (see routes/index.ts) since that's the path the admin panel client
 * calls.
 */
export const updateUserRole = catchAsync(async (req: Request, res: Response) => {
  const { email, isAdmin } = req.body;

  if (!email || typeof isAdmin !== 'boolean') {
    throw new AppError('Email and a boolean isAdmin value are required', 400);
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const target = await UserModel.findOne({ email: normalizedEmail });
  if (!target) {
    throw new AppError('User not found', 404);
  }

  // Guard against ending up with zero admins: if this request would
  // demote the last remaining admin, reject it. There's no auth layer
  // yet to know *who* is making the request, so this can't stop a
  // specific admin from demoting themselves — but it does stop the
  // system from ever being left with no admin at all, which is the
  // failure this guard actually needs to prevent.
  if (target.isAdmin && !isAdmin) {
    const otherAdminCount = await UserModel.countDocuments({
      isAdmin: true,
      email: { $ne: normalizedEmail },
    });
    if (otherAdminCount === 0) {
      throw new AppError('At least one admin account must remain.', 400);
    }
  }

  const updatedUser = await UserModel.findOneAndUpdate(
    { email: normalizedEmail },
    { $set: { isAdmin } },
    { new: true } // Return the document after the update is applied
  );

  if (!updatedUser) {
    throw new AppError('User not found', 404);
  }

  sendResponse(res, 200, 'User role updated successfully', updatedUser);
});

/**
 * PATCH /api/users/info
 * Update additional user profile information (age, security deposit, ID number).
 */
export const updateUserInfo = catchAsync(async (req: Request, res: Response) => {
  const { email, age, securityDeposit, idNumber } = req.body;

  if (!email) {
    throw new AppError('Email is required', 400);
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const updatedUser = await UserModel.findOneAndUpdate(
    { email: normalizedEmail },
    { $set: { age, securityDeposit, idNumber } },
    { new: true }
  );

  if (!updatedUser) {
    throw new AppError('User not found', 404);
  }

  sendResponse(res, 200, 'User information updated successfully', updatedUser);
});
