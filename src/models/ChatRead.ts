import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ChatReadSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    groupId: { type: Schema.Types.ObjectId, ref: "ChatGroup", required: true },
    lastReadAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

ChatReadSchema.index({ userId: 1, groupId: 1 }, { unique: true });

export type ChatReadDocument = InferSchemaType<typeof ChatReadSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ChatRead: Model<ChatReadDocument> =
  mongoose.models.ChatRead ?? mongoose.model<ChatReadDocument>("ChatRead", ChatReadSchema);
