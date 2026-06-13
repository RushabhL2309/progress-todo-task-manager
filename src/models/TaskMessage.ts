import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const TaskMessageSchema = new Schema(
  {
    itemId: { type: Schema.Types.ObjectId, ref: "ProjectItem", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

TaskMessageSchema.index({ itemId: 1, createdAt: 1 });

export type TaskMessageDocument = InferSchemaType<typeof TaskMessageSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export const TaskMessage: Model<TaskMessageDocument> =
  mongoose.models.TaskMessage ??
  mongoose.model<TaskMessageDocument>("TaskMessage", TaskMessageSchema);
