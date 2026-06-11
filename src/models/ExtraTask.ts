import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ExtraTaskSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    completed: { type: Boolean, default: false },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    projectItemId: { type: Schema.Types.ObjectId, ref: "ProjectItem", default: null },
  },
  { timestamps: true }
);

ExtraTaskSchema.index({ date: 1 });

export type ExtraTaskDocument = InferSchemaType<typeof ExtraTaskSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ExtraTask: Model<ExtraTaskDocument> =
  mongoose.models.ExtraTask ??
  mongoose.model<ExtraTaskDocument>("ExtraTask", ExtraTaskSchema);
