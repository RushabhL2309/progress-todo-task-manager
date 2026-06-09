import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ScheduledTaskSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type ScheduledTaskDocument = InferSchemaType<typeof ScheduledTaskSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ScheduledTask: Model<ScheduledTaskDocument> =
  mongoose.models.ScheduledTask ??
  mongoose.model<ScheduledTaskDocument>("ScheduledTask", ScheduledTaskSchema);
