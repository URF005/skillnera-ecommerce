// app/api/mlm/my-commissions/route.js
import { isAuthenticated } from "@/lib/authentication";
import { connectDB } from "@/lib/databaseConnection";
import { catchError, response } from "@/lib/helperFunction";
import MLMCommission from "@/models/MLMCommission.model";
import mongoose from "mongoose";

export async function GET() {
  try {
    await connectDB();

    const auth = await isAuthenticated("user");
    if (!auth.isAuth) return response(false, 403, "Unauthorized.");

    const userId = new mongoose.Types.ObjectId(auth.userId);

    // Aggregate totals by status
    const agg = await MLMCommission.aggregate([
      { $match: { earner: userId } },
      {
        $group: {
          _id: "$status",
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const totals = {
      pendingAmount: 0,
      approvedAmount: 0,
      paidAmount: 0,
      voidAmount: 0,
    };
    const counts = {
      pendingCount: 0,
      approvedCount: 0,
      paidCount: 0,
      voidCount: 0,
    };

    for (const row of agg) {
      const kA = `${row._id}Amount`;
      const kC = `${row._id}Count`;
      if (kA in totals) totals[kA] = row.amount;
      if (kC in counts) counts[kC] = row.count;
    }

    // Recent 5 commission rows
    const recent = await MLMCommission.find({ earner: userId })
      .populate("buyer", "name email referralCode")
      .populate("order", "order_id status")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return response(true, 200, "OK", { totals, counts, recent });
  } catch (error) {
    return catchError(error);
  }
}
