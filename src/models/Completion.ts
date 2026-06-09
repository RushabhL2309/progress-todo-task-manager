import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const CompletionSchema = new Schema(
  {
    scheduledTaskId: {
      type: Schema.Types.ObjectId,
      ref: "ScheduledTask",
      required: true,
    },
    date: { type: String, required: true },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

CompletionSchema.index({ scheduledTaskId: 1, date: 1 }, { unique: true });
CompletionSchema.index({ date: 1 });

export type CompletionDocument = InferSchemaType<typeof CompletionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Completion: Model<CompletionDocument> =
  mongoose.models.Completion ??
  mongoose.model<CompletionDocument>("Completion", CompletionSchema);
