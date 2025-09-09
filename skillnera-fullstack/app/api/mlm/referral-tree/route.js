// app/api/mlm/referral-tree/route.js
import { isAuthenticated } from "@/lib/authentication";
import { connectDB } from "@/lib/databaseConnection";
import { response, catchError } from "@/lib/helperFunction";
import User from "@/models/User.model";
import MLMCommission from "@/models/MLMCommission.model";
import mongoose from "mongoose";

async function findRoot(q) {
  if (!q) return null;
  // try by ObjectId
  if (mongoose.Types.ObjectId.isValid(q)) {
    const u = await User.findById(q).select("name email referralCode avatar.url mlmActive referredAt").lean();
    if (u) return u;
  }
  // by referralCode
  let u = await User.findOne({ referralCode: q }).select("name email referralCode avatar.url mlmActive referredAt").lean();
  if (u) return u;
  // by email
  u = await User.findOne({ email: q }).select("name email referralCode avatar.url mlmActive referredAt").lean();
  return u;
}

async function commissionTotals(userId) {
  const agg = await MLMCommission.aggregate([
    { $match: { earner: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: "$status", amount: { $sum: "$amount" } } },
  ]);

  const totals = {
    pendingAmount: 0,
    approvedAmount: 0,
    paidAmount: 0,
    voidAmount: 0,
  };

  for (const row of agg) {
    if (row._id === "pending") totals.pendingAmount = row.amount;
    if (row._id === "approved") totals.approvedAmount = row.amount;
    if (row._id === "paid") totals.paidAmount = row.amount;
    if (row._id === "void") totals.voidAmount = row.amount;
  }
  return totals;
}

async function buildNode(user, depth, per, includeTotals) {
  const node = {
    _id: user._id,
    name: user.name,
    email: user.email,
    referralCode: user.referralCode,
    avatar: user.avatar?.url || null,
    mlmActive: user.mlmActive,
    referredAt: user.referredAt,
    childrenCount: 0,
    totals: includeTotals ? await commissionTotals(user._id) : undefined,
    children: [],
  };

  // total direct children count (for badge)
  node.childrenCount = await User.countDocuments({ referredBy: user._id });

  if (depth <= 0) return node;

  const children = await User.find({ referredBy: user._id })
    .select("name email referralCode avatar.url mlmActive referredAt")
    .sort({ createdAt: -1 })
    .limit(per)
    .lean();

  for (const ch of children) {
    node.children.push(await buildNode(ch, depth - 1, per, includeTotals));
  }
  return node;
}

export async function GET(request) {
  try {
    const auth = await isAuthenticated("admin");
    if (!auth.isAuth) return response(false, 403, "Unauthorized.");

    await connectDB();

    const url = new URL(request.url);
    const q = (url.searchParams.get("root") || "").trim(); // email / referralCode / userId
    const depth = Math.max(0, Math.min(6, Number(url.searchParams.get("depth") || 3)));
    const per = Math.max(1, Math.min(100, Number(url.searchParams.get("per") || 20)));
    const includeTotals = (url.searchParams.get("includeTotals") || "1") === "1";

    const root = await findRoot(q);
    if (!root) return response(false, 404, "Root user not found. Search by email, referral code, or user ID.");

    const tree = await buildNode(root, depth, per, includeTotals);
    return response(true, 200, "OK", { tree, meta: { depth, per, includeTotals } });
  } catch (error) {
    return catchError(error);
  }
}
