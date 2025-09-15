import { isAuthenticated } from "@/lib/authentication";
import { connectDB } from "@/lib/databaseConnection";
import { catchError, response } from "@/lib/helperFunction";
import Kyc from "@/models/Kyc.model";
import { z } from "zod";

const bodyZ = z.object({
  _id: z.string().length(24, "Invalid id"),
  status: z.enum(["pending", "verified", "unverified"]),
  adminNote: z.string().optional(),
});

export async function PUT(request) {
  try {
    const auth = await isAuthenticated("admin");
    if (!auth.isAuth) return response(false, 403, "Unauthorized.");
    await connectDB();

    const parsed = bodyZ.safeParse(await request.json());
    if (!parsed.success) return response(false, 400, "Invalid payload.", parsed.error);

    const { _id, status, adminNote } = parsed.data;

    const update = {
      status,
      adminNote: adminNote || null,
      verifiedBy: status === "verified" ? auth.userId : null,
      verifiedAt: status === "verified" ? new Date() : null,
    };

    const doc = await Kyc.findByIdAndUpdate(_id, update, { new: true });
    if (!doc) return response(false, 404, "KYC not found.");

    return response(true, 200, "KYC updated.", doc);
  } catch (e) {
    return catchError(e);
  }
}
