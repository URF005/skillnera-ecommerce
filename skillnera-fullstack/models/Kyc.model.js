import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    url: { type: String, trim: true, required: true },
    public_id: { type: String, trim: true, required: true },
    label: { type: String, trim: true },
  },
  { _id: false }
);

const kycSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, required: true, index: true },
    status: { type: String, enum: ["pending", "verified", "unverified"], default: "pending", index: true },
    docs: {
      idFront: { type: fileSchema, required: true },
      idBack: { type: fileSchema, required: true },
      selfie: { type: fileSchema, required: true },
      extras: { type: [fileSchema], default: [] },
    },
    adminNote: { type: String, trim: true },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

const KycModel = mongoose.models.Kyc || mongoose.model("Kyc", kycSchema, "kyc");
export default KycModel;
