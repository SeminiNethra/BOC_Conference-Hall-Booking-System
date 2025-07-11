import mongoose, { Document, Schema, Model } from 'mongoose';

// Update the Mongoose model to remove ampm
export interface IMeeting extends Document {
  title: string;
  date: Date;
  startTime: {
    hour: number;
    minute: number;
  };
  endTime: {
    hour: number;
    minute: number;
  };
  location: 'Room A' | 'Room B';
  note?: string;
  participants: string[];
  createdBy: string;
  updatedBy?: string;
  isCancelled: boolean;
}

const MeetingSchema = new Schema<IMeeting>(
  {
    title: { type: String, required: true },
    date: { type: Date, required: true },
    startTime: {
      hour: { type: Number, required: true, min: 8, max: 16 },
      minute: { type: Number, required: true, min: 0, max: 59 }
    },
    endTime: {
      hour: { type: Number, required: true, min: 8, max: 17 },
      minute: { type: Number, required: true, min: 0, max: 59 }
    },
    location: { type: String, enum: ['Room A', 'Room B'], required: true },
    note: { type: String },
    participants: [{ type: String, required: true }],
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
    isCancelled: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const Meeting: Model<IMeeting> = mongoose.models.Meeting || mongoose.model<IMeeting>('Meeting', MeetingSchema);

export default Meeting;
