import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ChatMessageSchema = new Schema(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "ChatGroup", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: null },
    imageUrl: { type: String, default: null },
    imagePublicId: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ChatMessageSchema.index({ groupId: 1, createdAt: -1 });

export type ChatMessageDocument = InferSchemaType<typeof ChatMessageSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export const ChatMessage: Model<ChatMessageDocument> =
  mongoose.models.ChatMessage ??
  mongoose.model<ChatMessageDocument>("ChatMessage", ChatMessageSchema);
