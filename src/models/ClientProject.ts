import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const PaymentCheckSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    checked: { type: Boolean, default: false },
  },
  { _id: false }
);

const PaymentFlagsSchema = new Schema(
  {
    advanceReceived: { type: Boolean, default: false },
    partialPaid: { type: Boolean, default: false },
    fullPaid: { type: Boolean, default: false },
    customLabels: { type: [String], default: [] },
  },
  { _id: false }
);

const ClientProjectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    stage: {
      type: String,
      enum: ["enquiry", "running", "payment_due", "closed"],
      default: "enquiry",
    },
    notes: { type: String, default: "" },
    followUpDate: { type: String, default: null },
    paymentNotes: { type: String, default: "" },
    paymentChecks: { type: [PaymentCheckSchema], default: [] },
    paymentFlags: { type: PaymentFlagsSchema, default: () => ({}) },
    linkedProjectId: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

ClientProjectSchema.index({ stage: 1, createdBy: 1 });
ClientProjectSchema.index({ assignedUserIds: 1 });

export type ClientProjectDocument = InferSchemaType<typeof ClientProjectSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ClientProject: Model<ClientProjectDocument> =
  mongoose.models.ClientProject ??
  mongoose.model<ClientProjectDocument>("ClientProject", ClientProjectSchema);
