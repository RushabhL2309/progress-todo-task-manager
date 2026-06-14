import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ProjectItemSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    type: { type: String, enum: ["issue", "feature", "task"], default: "task" },
    status: { type: String, enum: ["open", "resolved"], default: "open" },
    dueDate: { type: String, default: null },
    sortOrder: { type: Number, default: 0 },
    assignedUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    completionNote: { type: String, default: "" },
  },
  { timestamps: true }
);

ProjectItemSchema.index({ projectId: 1, status: 1 });
ProjectItemSchema.index({ assignedUserId: 1, status: 1 });
ProjectItemSchema.index({ createdBy: 1 });
ProjectItemSchema.index({ status: 1, dueDate: 1 });

export type ProjectItemDocument = InferSchemaType<typeof ProjectItemSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ProjectItem: Model<ProjectItemDocument> =
  mongoose.models.ProjectItem ??
  mongoose.model<ProjectItemDocument>("ProjectItem", ProjectItemSchema);
