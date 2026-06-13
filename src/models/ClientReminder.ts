import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ClientReminderSchema = new Schema(
  {
    clientProjectId: { type: Schema.Types.ObjectId, ref: "ClientProject", required: true },
    title: { type: String, required: true, trim: true },
    dueDate: { type: String, default: null },
    dueTime: { type: String, default: null },
    assignedUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    simple: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ClientReminderSchema.index({ clientProjectId: 1, createdAt: -1 });
ClientReminderSchema.index({ dueDate: 1, assignedUserId: 1 });

export type ClientReminderDocument = InferSchemaType<typeof ClientReminderSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export const ClientReminder: Model<ClientReminderDocument> =
  mongoose.models.ClientReminder ??
  mongoose.model<ClientReminderDocument>("ClientReminder", ClientReminderSchema);
