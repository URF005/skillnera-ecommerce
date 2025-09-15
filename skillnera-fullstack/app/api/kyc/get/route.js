import { isAuthenticated } from "@/lib/authentication";
import { connectDB } from "@/lib/databaseConnection";
import { catchError, response } from "@/lib/helperFunction";
import Kyc from "@/models/Kyc.model";

export async function GET() {
  try {
    const auth = await isAuthenticated("user");
    if (!auth.isAuth) return response(false, 403, "Unauthorized.");
    await connectDB();

    const kyc = await Kyc.findOne({ user: auth.userId, deletedAt: null }).lean();
    return response(true, 200, "OK", kyc || null);
  } catch (e) {
    return catchError(e);
  }
}
