import { Request, Response } from 'express';
import { BookingModel } from '../models/booking.model';
import { UserModel } from '../models/user.model';
import { catchAsync } from '../utils/catch-async';
import { sendResponse } from '../utils/send-response';
import { AppError } from '../utils/app-error';

/**
 * GET /api/bookings/all
 * Fetch every booking in the database.
 */
export const getAllBookings = catchAsync(async (_req: Request, res: Response) => {
  const bookings = await BookingModel.find();
  sendResponse(res, 200, 'Bookings retrieved successfully', bookings);
});

/**
 * GET /api/bookings?email=someone@example.com
 * Fetch all bookings that belong to a specific user.
 */
export const getBookingsByEmail = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.query;

  if (!email || typeof email !== 'string') {
    throw new AppError('A valid email query parameter is required', 400);
  }

  const bookings = await BookingModel.find({ email });
  sendResponse(res, 200, 'Bookings retrieved successfully', bookings);
});

/**
 * POST /api/bookings
 * Create a new booking.
 */
export const createBooking = catchAsync(async (req: Request, res: Response) => {
  const bookingData = req.body;

  if (!bookingData.email) {
    throw new AppError('A booking must include a user email', 400);
  }

  const normalizedEmail = String(bookingData.email).trim().toLowerCase();

  if (bookingData.paymentMethod === 'points' && Number(bookingData.points) > 0) {
    const pointsToDeduct = Number(bookingData.points);
    const updatedUser = await UserModel.findOneAndUpdate(
      {
        email: normalizedEmail,
        points: { $gte: pointsToDeduct },
      },
      {
        $inc: {
          points: -pointsToDeduct,
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      throw new AppError('You do not have enough points for this booking.', 400);
    }
  }

  const bookingToSave: Record<string, unknown> = {
    ...bookingData,
    email: normalizedEmail,
    points: Number(bookingData.points) || 0,
    price: Number(bookingData.price) || 0,
    nights: Number(bookingData.nights) || 0,
  };

  if (bookingToSave.paymentDetails && bookingData.paymentMethod === 'cash') {
    const cardNumber = String(
      (bookingData.paymentDetails as { cardNumber?: string }).cardNumber || '',
    ).replace(/\D/g, '');
    bookingToSave.paymentDetails = {
      cardNumber: cardNumber ? `**** **** **** ${cardNumber.slice(-4)}` : undefined,
      expiryDate: String(
        (bookingData.paymentDetails as { expiryDate?: string }).expiryDate || '',
      ),
      cvv: undefined,
    };
  } else {
    bookingToSave.paymentDetails = null;
  }

  const newBooking = await BookingModel.create(bookingToSave);
  sendResponse(res, 201, 'Booking created successfully', newBooking);
});

/**
 * PATCH /api/bookings/:id
 * Update a booking's status or details (e.g. confirm or cancel it).
 */
export const updateBooking = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const updatedBooking = await BookingModel.findByIdAndUpdate(
    id,
    { $set: req.body },
    { new: true, runValidators: true }
  );

  if (!updatedBooking) {
    throw new AppError('Booking not found', 404);
  }

  sendResponse(res, 200, 'Booking updated successfully', updatedBooking);
});

/**
 * DELETE /api/bookings/:id
 * Cancel/remove a booking.
 */
export const deleteBooking = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const deletedBooking = await BookingModel.findByIdAndDelete(id);
  if (!deletedBooking) {
    throw new AppError('Booking not found', 404);
  }

  sendResponse(res, 200, 'Booking deleted successfully', deletedBooking);
});
