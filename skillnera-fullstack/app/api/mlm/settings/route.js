import { isAuthenticated } from "@/lib/authentication";
import { connectDB } from "@/lib/databaseConnection";
import { catchError, response } from "@/lib/helperFunction";
import MLMSettings from "@/models/MLMSettings.model";

export async function GET() {
  try {
    // Admin-only; change to public if you prefer
    const auth = await isAuthenticated("admin");
    if (!auth.isAuth) return response(false, 403, "Unauthorized.");

    await connectDB();

    const s = await MLMSettings.findOne().lean();
    return response(true, 200, "OK", { settings: s });
  } catch (error) {
    return catchError(error);
  }
}

export async function PUT(request) {
  try {
    const auth = await isAuthenticated("admin");
    if (!auth.isAuth) return response(false, 403, "Unauthorized.");

    await connectDB();

    const body = await request.json();

    // Basic guards (you can add zod if you like)
    if (body?.levels && Array.isArray(body.levels)) {
      body.levels = body.levels
        .map((lv, i) => ({
          level: Number(lv.level ?? i + 1),
          percent: Number(lv.percent ?? 0),
        }))
        .filter((lv) => lv.level > 0 && lv.percent >= 0);
    }

    const settings = await MLMSettings.findOneAndUpdate({}, body, {
      upsert: true,
      new: true,
    });

    return response(true, 200, "Saved.", { settings });
  } catch (error) {
    return catchError(error);
  }
}
