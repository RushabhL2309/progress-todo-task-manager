import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const FinanceCategorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["expense", "income", "both"],
      default: "expense",
    },
    color: { type: String, default: "#6366f1" },
    icon: { type: String, default: "tag" },
  },
  { timestamps: true }
);

FinanceCategorySchema.index({ userId: 1, name: 1 }, { unique: true });

export type FinanceCategoryDocument = InferSchemaType<typeof FinanceCategorySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const FinanceCategory: Model<FinanceCategoryDocument> =
  mongoose.models.FinanceCategory ??
  mongoose.model<FinanceCategoryDocument>("FinanceCategory", FinanceCategorySchema);
