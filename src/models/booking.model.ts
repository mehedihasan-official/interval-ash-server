import { Schema, model, Document, Types } from 'mongoose';

/**
 * TypeScript interface describing a Booking document.
 */
export interface IBooking extends Document {
  email: string;
  resort?: Record<string, unknown> | null;
  resortId?: Types.ObjectId;
  paymentMethod: 'points' | 'cash';
  price?: number;
  points?: number;
  unitType?: string;
  startDate?: string;
  endDate?: string;
  nights?: number;
  billingInfo?: {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    country: string;
    city: string;
    state: string;
    postalCode: string;
    phoneNumber: string;
  };
  paymentDetails?: {
    cardNumber?: string;
    expiryDate?: string;
    cvv?: string;
  } | null;
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
    resort: {
      type: Schema.Types.Mixed,
      default: null,
    },
    resortId: {
      type: Schema.Types.ObjectId,
      ref: 'Resort',
    },
    paymentMethod: {
      type: String,
      enum: ['points', 'cash'],
      required: [true, 'Payment method is required'],
    },
    price: {
      type: Number,
      min: 0,
    },
    points: {
      type: Number,
      min: 0,
    },
    unitType: {
      type: String,
      trim: true,
    },
    startDate: {
      type: String,
      trim: true,
    },
    endDate: {
      type: String,
      trim: true,
    },
    nights: {
      type: Number,
      min: 1,
    },
    billingInfo: {
      type: {
        firstName: String,
        lastName: String,
        address1: String,
        address2: String,
        country: String,
        city: String,
        state: String,
        postalCode: String,
        phoneNumber: String,
      },
    },
    paymentDetails: {
      type: {
        cardNumber: String,
        expiryDate: String,
        cvv: String,
      },
      default: null,
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
