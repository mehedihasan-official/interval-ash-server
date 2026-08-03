import { Schema, model, Document } from 'mongoose';

/**
 * TypeScript interface describing a User document.
 * Extending `Document` gives access to Mongoose instance properties
 * (e.g. `_id`, `save()`) alongside our own fields.
 */
export interface IUser extends Document {
  name: string;
  email: string;
  isAdmin: boolean;
  age?: number;
  securityDeposit?: number;
  idNumber?: string;
  points: number;
  cashBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    age: {
      type: Number,
    },
    securityDeposit: {
      type: Number,
    },
    idNumber: {
      type: String,
      trim: true,
    },
    points: {
      type: Number,
      default: 0,
    },
    cashBalance: {
      type: Number,
      default: 0,
    },
  },
  {
    // Automatically manages createdAt / updatedAt fields
    timestamps: true,
  }
);

export const UserModel = model<IUser>('User', userSchema);
