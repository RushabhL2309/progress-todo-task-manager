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
    deadline: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    assignedUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    linkedClientId: { type: Schema.Types.ObjectId, ref: "ClientProject", default: null },
  },
  { timestamps: true }
);

ProjectSchema.index({ createdBy: 1 });
ProjectSchema.index({ assignedUserIds: 1 });

export type ProjectDocument = InferSchemaType<typeof ProjectSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Project: Model<ProjectDocument> =
  mongoose.models.Project ?? mongoose.model<ProjectDocument>("Project", ProjectSchema);
