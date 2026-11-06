import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import { ReservationStatus, RESERVATION_STATUSES } from '../constants/reservation';

export interface IReservation {
  reference: string;
  guest: Types.ObjectId;
  roomType: Types.ObjectId;
  checkIn: Date;
  checkOut: Date;
  guestCount: number;
  roomCount: number;
  priceSnapshot: number; // Nightly rate locked at booking time
  totalAmount: number;   // Computed strictly on the server: priceSnapshot * nights * roomCount
  status: ReservationStatus;
  specialRequests?: string;
  cancelledAt?: Date;
  cancellationReason?: string;
  checkedInAt?: Date;
  checkedOutAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReservationDocument extends IReservation, Document {}

export interface IReservationModel extends Model<IReservationDocument> {}

const reservationSchema = new Schema<IReservationDocument, IReservationModel>(
  {
    reference: {
      type: String,
      required: [true, 'Reservation reference is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    guest: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Guest ID is required'],
      index: true,
    },
    roomType: {
      type: Schema.Types.ObjectId,
      ref: 'RoomType',
      required: [true, 'RoomType ID is required'],
      index: true,
    },
    checkIn: {
      type: Date,
      required: [true, 'Check-in date is required'],
      index: true,
    },
    checkOut: {
      type: Date,
      required: [true, 'Check-out date is required'],
      index: true,
    },
    guestCount: {
      type: Number,
      required: [true, 'Guest count is required'],
      min: [1, 'Must have at least 1 guest'],
    },
    roomCount: {
      type: Number,
      required: [true, 'Room count is required'],
      min: [1, 'Must book at least 1 room'],
      default: 1,
    },
    priceSnapshot: {
      type: Number,
      required: [true, 'Price snapshot is required'],
      min: [0, 'Price snapshot cannot be negative'],
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: RESERVATION_STATUSES,
        message: '{VALUE} is not a valid reservation status',
      },
      default: ReservationStatus.CONFIRMED,
      index: true,
    },
    specialRequests: {
      type: String,
      trim: true,
      maxlength: [500, 'Special requests cannot exceed 500 characters'],
    },
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
    },
    checkedInAt: {
      type: Date,
    },
    checkedOutAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// COMPOUND INDEXES FOR QUERY OPTIMIZATION:
// 1. Guest portal: "My Reservations" sorted latest first
reservationSchema.index({ guest: 1, createdAt: -1 });

// 2. Admin & Front Desk: Filter by status and check-in date (Today's arrivals)
reservationSchema.index({ status: 1, checkIn: 1 });

// 3. Admin & Front Desk: Filter by status and check-out date (Today's departures)
reservationSchema.index({ status: 1, checkOut: 1 });

export const Reservation = mongoose.model<
  IReservationDocument,
  IReservationModel
>('Reservation', reservationSchema);

