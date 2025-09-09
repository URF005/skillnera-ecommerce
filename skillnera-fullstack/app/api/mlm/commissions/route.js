import { isAuthenticated } from "@/lib/authentication";
import { connectDB } from "@/lib/databaseConnection";
import { catchError, response } from "@/lib/helperFunction";
import MLMCommission from "@/models/MLMCommission.model";

export async function GET(request) {
  try {
    const auth = await isAuthenticated("admin");
    if (!auth.isAuth) return response(false, 403, "Unauthorized.");

    await connectDB();

    const url = new URL(request.url);
    const status = url.searchParams.get("status"); // optional: pending/approved/paid/void

    const q = {};
    if (status) q.status = status;

    const items = await MLMCommission.find(q)
      .populate("order", "order_id subtotal totalAmount status")
      .populate("earner", "name email referralCode")
      .populate("buyer", "name email referralCode")
      .sort({ createdAt: -1 })
      .lean();

    return response(true, 200, "OK", { items });
  } catch (error) {
    return catchError(error);
  }
}
