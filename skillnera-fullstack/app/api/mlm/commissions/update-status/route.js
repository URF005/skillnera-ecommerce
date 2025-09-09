import { isAuthenticated } from "@/lib/authentication";
import { connectDB } from "@/lib/databaseConnection";
import { catchError, response } from "@/lib/helperFunction";
import MLMCommission from "@/models/MLMCommission.model";

export async function PUT(request) {
  try {
    const auth = await isAuthenticated("admin");
    if (!auth.isAuth) return response(false, 403, "Unauthorized.");

    await connectDB();

    const { id, status, note } = await request.json();

    if (!id || !status) {
      return response(false, 400, "id and status are required.");
    }

    const allowed = ["pending", "approved", "paid", "void"];
    if (!allowed.includes(String(status))) {
      return response(false, 400, "Invalid status value.");
    }

    const updated = await MLMCommission.findByIdAndUpdate(
      id,
      { status, ...(note ? { note } : {}) },
      { new: true }
    );

    if (!updated) return response(false, 404, "Commission not found.");

    return response(true, 200, "Updated.", updated);
  } catch (error) {
    return catchError(error);
  }
}
