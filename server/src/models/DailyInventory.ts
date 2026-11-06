import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IDailyInventory {
  roomTypeId: Types.ObjectId;
  date: Date; // Normalized to midnight UTC (00:00:00.000Z)
  totalInventory: number;
  availableCount: number;
  reservedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDailyInventoryDocument extends IDailyInventory, Document {}

export interface IDailyInventoryModel extends Model<IDailyInventoryDocument> {}

const dailyInventorySchema = new Schema<IDailyInventoryDocument, IDailyInventoryModel>(
  {
    roomTypeId: {
      type: Schema.Types.ObjectId,
      ref: 'RoomType',
      required: [true, 'RoomType ID is required'],
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Inventory date is required'],
      index: true,
    },
    totalInventory: {
      type: Number,
      required: [true, 'Total inventory is required'],
      min: [0, 'Total inventory cannot be negative'],
    },
    availableCount: {
      type: Number,
      required: [true, 'Available count is required'],
      min: [0, 'Available count cannot drop below zero'],
    },
    reservedCount: {
      type: Number,
      required: [true, 'Reserved count is required'],
      min: [0, 'Reserved count cannot be negative'],
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// CRITICAL UNIQUE COMPOUND INDEX:
// Guarantees one inventory document per room type per calendar date.
// Ensures O(1) atomic updates without duplicate records.
dailyInventorySchema.index({ roomTypeId: 1, date: 1 }, { unique: true });

// Compound index to accelerate date-range availability searches
dailyInventorySchema.index({ roomTypeId: 1, date: 1, availableCount: 1 });

export const DailyInventory = mongoose.model<
  IDailyInventoryDocument,
  IDailyInventoryModel
>('DailyInventory', dailyInventorySchema);

