import mongoose from "mongoose";

const LevelSchema = new mongoose.Schema(
  {
    level: { type: Number, required: true },     // 1,2,3...
    percent: { type: Number, required: true },   // e.g. 5 => 5%
  },
  { _id: false }
);

const MLMSettingsSchema = new mongoose.Schema(
  {
    isEnabled: { type: Boolean, default: true },
    levels: {
      type: [LevelSchema],
      default: [
        { level: 1, percent: 5 },
        { level: 2, percent: 3 },
        { level: 3, percent: 2 },
      ],
    },
    minOrderAmount: { type: Number, default: 0 },         // only create commissions if order >= this
    preventSelfReferral: { type: Boolean, default: true },// block self-commission at L1
    oneCommissionPerOrder: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const MLMSettingsModel =
  mongoose.models.MLMSettings ||
  mongoose.model("MLMSettings", MLMSettingsSchema, "mlm_settings");

export default MLMSettingsModel;
