import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ProjectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["active", "paused", "completed"],
      default: "active",
    },
    color: { type: String, default: "#5B7C6B" },
  },
  { timestamps: true }
);

export type ProjectDocument = InferSchemaType<typeof ProjectSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Project: Model<ProjectDocument> =
  mongoose.models.Project ?? mongoose.model<ProjectDocument>("Project", ProjectSchema);
