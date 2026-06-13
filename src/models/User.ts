import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const UserModulesSchema = new Schema(
  {
    todo: { type: Boolean, default: false },
    tracker: { type: Boolean, default: false },
    projects: { type: Boolean, default: false },
    client_updates: { type: Boolean, default: false },
    chat: { type: Boolean, default: false },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ["master", "user"], default: "user" },
    modules: { type: UserModulesSchema, default: () => ({}) },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export type UserDocument = InferSchemaType<typeof UserSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const User: Model<UserDocument> =
  mongoose.models.User ?? mongoose.model<UserDocument>("User", UserSchema);
