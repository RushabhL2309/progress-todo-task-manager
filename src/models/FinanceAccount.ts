import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const FinanceAccountSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["bank", "cash", "card", "wallet", "savings"],
      default: "bank",
    },
    initialBalance: { type: Number, default: 0 },
    color: { type: String, default: "#3b82f6" },
    icon: { type: String, default: "bank" },
    isDefault: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

FinanceAccountSchema.index({ userId: 1, archived: 1 });

export type FinanceAccountDocument = InferSchemaType<typeof FinanceAccountSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const FinanceAccount: Model<FinanceAccountDocument> =
  mongoose.models.FinanceAccount ??
  mongoose.model<FinanceAccountDocument>("FinanceAccount", FinanceAccountSchema);
