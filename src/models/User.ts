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
    name: { type: String, required: true, trim: true },
    nameKey: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, default: "a@gmail.com", lowercase: true, trim: true },
    notificationEmail: { type: String, default: null, lowercase: true, trim: true },
    emailUpdatesEnabled: { type: Boolean, default: false },
    passwordChangeEnabled: { type: Boolean, default: false },
    passwordHash: { type: String, required: true },
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

if (mongoose.models.User) {
  mongoose.deleteModel("User");
}

export const User: Model<UserDocument> = mongoose.model<UserDocument>("User", UserSchema);
