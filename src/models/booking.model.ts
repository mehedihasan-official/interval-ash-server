import { Schema, model, Document, Types } from 'mongoose';

/**
 * TypeScript interface describing a Booking document.
 */
export interface IBooking extends Document {
  email: string;
  resortId?: Types.ObjectId;
  checkInDate?: Date;
  checkOutDate?: Date;
  guests?: number;
  totalPrice?: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    email: {
      type: String,
      required: [true, 'Booking must be associated with a user email'],
      trim: true,
      lowercase: true,
    },
    resortId: {
      type: Schema.Types.ObjectId,
      ref: 'Resort',
    },
    checkInDate: {
      type: Date,
    },
    checkOutDate: {
      type: Date,
    },
    guests: {
      type: Number,
      min: 1,
    },
    totalPrice: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

export const BookingModel = model<IBooking>('Booking', bookingSchema, 'bookings');
