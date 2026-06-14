import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ChatGroupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    memberIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

ChatGroupSchema.index({ memberIds: 1 });

export type ChatGroupDocument = InferSchemaType<typeof ChatGroupSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ChatGroup: Model<ChatGroupDocument> =
  mongoose.models.ChatGroup ?? mongoose.model<ChatGroupDocument>("ChatGroup", ChatGroupSchema);
