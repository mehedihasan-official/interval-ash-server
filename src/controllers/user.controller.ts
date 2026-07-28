import { Request, Response } from 'express';
import { UserModel } from '../models/user.model';
import { catchAsync } from '../utils/catch-async';
import { sendResponse } from '../utils/send-response';
import { AppError } from '../utils/app-error';

/**
 * GET /api/users
 * Fetch every user in the database.
 */
export const getAllUsers = catchAsync(async (_req: Request, res: Response) => {
  const users = await UserModel.find();
  sendResponse(res, 200, 'Users retrieved successfully', users);
});

/**
 * GET /api/users/:email
 * Fetch a single user by email address.
 */
export const getUserByEmail = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.params;

  const user = await UserModel.findOne({ email });
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

  const existingUser = await UserModel.findOne({ email });
  if (existingUser) {
    throw new AppError('A user with this email already exists', 409);
  }

  const newUser = await UserModel.create(req.body);
  sendResponse(res, 201, 'User created successfully', newUser);
});

/**
 * PATCH /api/users/role
 * Update a user's admin status.
 */
export const updateUserRole = catchAsync(async (req: Request, res: Response) => {
  const { email, isAdmin } = req.body;

  if (!email || typeof isAdmin !== 'boolean') {
    throw new AppError('Email and a boolean isAdmin value are required', 400);
  }

  const updatedUser = await UserModel.findOneAndUpdate(
    { email },
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

  const updatedUser = await UserModel.findOneAndUpdate(
    { email },
    { $set: { age, securityDeposit, idNumber } },
    { new: true }
  );

  if (!updatedUser) {
    throw new AppError('User not found', 404);
  }

  sendResponse(res, 200, 'User information updated successfully', updatedUser);
});
