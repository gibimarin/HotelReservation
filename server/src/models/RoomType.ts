import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IRoomType {
  name: string;
  description: string;
  capacity: number;
  facilities: string[];
  pricePerNight: number;
  totalInventory: number;
  isActive: boolean;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRoomTypeDocument extends IRoomType, Document {}

export interface IRoomTypeModel extends Model<IRoomTypeDocument> {}

const roomTypeSchema = new Schema<IRoomTypeDocument, IRoomTypeModel>(
  {
    name: {
      type: String,
      required: [true, 'Room type name is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    capacity: {
      type: Number,
      required: [true, 'Guest capacity is required'],
      min: [1, 'Capacity must be at least 1 guest'],
      max: [10, 'Capacity cannot exceed 10 guests per room'],
    },
    facilities: {
      type: [String],
      default: [],
      validate: {
        validator: (v: string[]) => Array.isArray(v),
        message: 'Facilities must be an array of strings',
      },
    },
    pricePerNight: {
      type: Number,
      required: [true, 'Price per night is required'],
      min: [0, 'Price per night cannot be negative'],
    },
    totalInventory: {
      type: Number,
      required: [true, 'Total inventory is required'],
      min: [1, 'Total inventory must be at least 1 room'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    imageUrl: {
      type: String,
      required: [true, 'Room image URL is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to accelerate active room listing queries sorted by price
roomTypeSchema.index({ isActive: 1, pricePerNight: 1 });

export const RoomType = mongoose.model<IRoomTypeDocument, IRoomTypeModel>(
  'RoomType',
  roomTypeSchema
);

