import mongoose from "mongoose";

const MLMCommissionSchema = new mongoose.Schema(
  {
    order:  { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    earner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true }, // who earns
    buyer:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },              // who bought
    level:  { type: Number, required: true },              // 1,2,3...
    baseAmount: { type: Number, required: true },          // eligible base (subtotal/total)
    percent:    { type: Number, required: true },          // % at that level
    amount:     { type: Number, required: true },          // computed commission
    status:     { type: String, enum: ["pending","approved","paid","void"], default: "pending" },
    note:       { type: String }
  },
  { timestamps: true }
);

// prevent duplicates per (order, earner)
MLMCommissionSchema.index({ order: 1, earner: 1 }, { unique: true });

const MLMCommissionModel =
  mongoose.models.MLMCommission ||
  mongoose.model("MLMCommission", MLMCommissionSchema, "mlm_commissions");

export default MLMCommissionModel;
