import { Request, Response } from 'express';
import { UserModel } from '../models/user.model';
import { catchAsync } from '../utils/catch-async';
import { sendResponse } from '../utils/send-response';
import { AppError } from '../utils/app-error';

const POINTS_TO_USD_RATE = 0.025;
const COMMISSION_RATE = 0.3;

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

export const getWalletSummary = catchAsync(async (req: Request, res: Response) => {
  const email = String(req.query.email || '').trim().toLowerCase();

  if (!email) {
    throw new AppError('Email is required', 400);
  }

  const user = await UserModel.findOne({ email });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  sendResponse(res, 200, 'Wallet retrieved successfully', {
    points: user.points ?? 0,
    cashBalance: roundCurrency(user.cashBalance ?? 0),
  });
});

export const convertPointsToCash = catchAsync(async (req: Request, res: Response) => {
  const { email, points } = req.body;

  if (!email) {
    throw new AppError('Email is required', 400);
  }

  if (!Number.isInteger(points) || points <= 0) {
    throw new AppError('Points must be a positive integer', 400);
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await UserModel.findOne({ email: normalizedEmail });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if ((user.points ?? 0) < points) {
    throw new AppError('You do not have enough points for this conversion.', 400);
  }

  const grossAmount = roundCurrency(points * POINTS_TO_USD_RATE);
  const commissionAmount = roundCurrency(grossAmount * COMMISSION_RATE);
  const netAmount = roundCurrency(grossAmount - commissionAmount);

  const updatedUser = await UserModel.findOneAndUpdate(
    {
      email: normalizedEmail,
      points: { $gte: points },
    },
    {
      $inc: {
        points: -points,
        cashBalance: netAmount,
      },
    },
    { new: true }
  );

  if (!updatedUser) {
    throw new AppError('You do not have enough points for this conversion.', 400);
  }

  sendResponse(res, 200, 'Points converted successfully', {
    points: updatedUser.points ?? 0,
    cashBalance: roundCurrency(updatedUser.cashBalance ?? 0),
    pointsConverted: points,
    grossAmount,
    commissionAmount,
    netAmount,
  });
});
