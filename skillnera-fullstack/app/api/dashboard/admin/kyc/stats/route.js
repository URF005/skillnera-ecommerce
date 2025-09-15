import { isAuthenticated } from "@/lib/authentication";
import { connectDB } from "@/lib/databaseConnection";
import { catchError, response } from "@/lib/helperFunction";
import Kyc from "@/models/Kyc.model";

export async function GET() {
  try {
    const auth = await isAuthenticated("admin");
    if (!auth.isAuth) return response(false, 403, "Unauthorized.");
    await connectDB();

    const rows = await Kyc.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const m = Object.fromEntries(rows.map(r => [r._id, r.count]));
    const pending = m.pending || 0;
    const verified = m.verified || 0;
    const unverified = m.unverified || 0;
    const total = pending + verified + unverified;

    return Response.json({ success: true, data: { pending, verified, unverified, total } });
  } catch (e) {
    return catchError(e);
  }
}
