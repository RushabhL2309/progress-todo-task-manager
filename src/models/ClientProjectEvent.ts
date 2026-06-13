import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ClientProjectEventSchema = new Schema(
  {
    clientProjectId: { type: Schema.Types.ObjectId, ref: "ClientProject", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    description: { type: String, required: true },
    fromStage: { type: String, enum: ["enquiry", "running", "payment_due", "closed", null], default: null },
    toStage: { type: String, enum: ["enquiry", "running", "payment_due", "closed", null], default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ClientProjectEventSchema.index({ clientProjectId: 1, createdAt: -1 });

export type ClientProjectEventDocument = InferSchemaType<typeof ClientProjectEventSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export const ClientProjectEvent: Model<ClientProjectEventDocument> =
  mongoose.models.ClientProjectEvent ??
  mongoose.model<ClientProjectEventDocument>("ClientProjectEvent", ClientProjectEventSchema);
