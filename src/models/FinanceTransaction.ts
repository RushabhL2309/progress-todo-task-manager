import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const FinanceTransactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    accountId: { type: Schema.Types.ObjectId, ref: "FinanceAccount", required: true },
    toAccountId: { type: Schema.Types.ObjectId, ref: "FinanceAccount", default: null },
    type: {
      type: String,
      enum: ["expense", "income", "transfer"],
      required: true,
      default: "expense",
    },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    title: { type: String, default: "", trim: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    time: { type: String, default: "" }, // HH:mm
  },
  { timestamps: true }
);

FinanceTransactionSchema.index({ userId: 1, date: -1 });
FinanceTransactionSchema.index({ accountId: 1, date: -1 });
FinanceTransactionSchema.index({ userId: 1, type: 1, date: -1 });
FinanceTransactionSchema.index({ userId: 1, category: 1 });

export type FinanceTransactionDocument = InferSchemaType<typeof FinanceTransactionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const FinanceTransaction: Model<FinanceTransactionDocument> =
  mongoose.models.FinanceTransaction ??
  mongoose.model<FinanceTransactionDocument>("FinanceTransaction", FinanceTransactionSchema);
