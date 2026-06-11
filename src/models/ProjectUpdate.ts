import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ProjectUpdateSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    date: { type: String, required: true },
    description: { type: String, required: true, trim: true },
    resolvedItemIds: [{ type: Schema.Types.ObjectId, ref: "ProjectItem" }],
    linkedExtraTaskId: { type: Schema.Types.ObjectId, ref: "ExtraTask", default: null },
  },
  { timestamps: true }
);

ProjectUpdateSchema.index({ projectId: 1, date: -1 });

export type ProjectUpdateDocument = InferSchemaType<typeof ProjectUpdateSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ProjectUpdate: Model<ProjectUpdateDocument> =
  mongoose.models.ProjectUpdate ??
  mongoose.model<ProjectUpdateDocument>("ProjectUpdate", ProjectUpdateSchema);
