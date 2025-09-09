import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      enum: ["user", "admin"],
      default: "user",
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      trim: true,
      select: false,
    },
    avatar: {
      url: {
        type: String,
        trim: true,
      },
      public_id: {
        type: String,
        trim: true,
      },
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },

    // ===== MLM fields (minimal) =====
    referralCode: { type: String, unique: true, sparse: true }, // e.g. TNABC123
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    referredAt: { type: Date },
    mlmActive: { type: Boolean, default: true },
    // =================================
  },
  { timestamps: true }
);

// ----- Helpers for MLM code generation -----
function genReferralCode() {
  // TN + 6 chars (base36)
  const n = Math.floor(Math.random() * 36 ** 6);
  return `TN${n.toString(36).padStart(6, "0").toUpperCase()}`;
}

// Ensure referralCode exists & is unique (runs on create/save)
userSchema.pre("save", async function (next) {
  if (!this.referralCode) {
    for (let i = 0; i < 5; i++) {
      const code = genReferralCode();
      const exists = await this.constructor.findOne({ referralCode: code }).lean();
      if (!exists) {
        this.referralCode = code;
        break;
      }
    }
  }
  next();
});

// Keep your password hashing logic intact
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods = {
  comparePassword: async function (password) {
    return await bcrypt.compare(password, this.password);
  },
};

const UserModel = mongoose.models.User || mongoose.model("User", userSchema, "users");
export default UserModel;
