import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const PROJECT_ACTIVITY_ACTIONS = [
  "task_created",
  "task_completed",
  "task_reopened",
  "task_assigned",
  "work_logged",
  "project_closed",
] as const;

const ProjectActivitySchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    itemId: { type: Schema.Types.ObjectId, ref: "ProjectItem", default: null },
    action: { type: String, enum: PROJECT_ACTIVITY_ACTIONS, required: true },
    description: { type: String, required: true, trim: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ProjectActivitySchema.index({ projectId: 1, createdAt: -1 });
ProjectActivitySchema.index({ itemId: 1, createdAt: -1 });

export type ProjectActivityDocument = InferSchemaType<typeof ProjectActivitySchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export const ProjectActivity: Model<ProjectActivityDocument> =
  mongoose.models.ProjectActivity ??
  mongoose.model<ProjectActivityDocument>("ProjectActivity", ProjectActivitySchema);
