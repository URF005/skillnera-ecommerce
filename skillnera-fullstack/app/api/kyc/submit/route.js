import { isAuthenticated } from "@/lib/authentication";
import { connectDB } from "@/lib/databaseConnection";
import { catchError, response } from "@/lib/helperFunction";
import Kyc from "@/models/Kyc.model";
import { z } from "zod";

const fileZ = z.object({
  url: z.string().url(),
  public_id: z.string().min(1),
  label: z.string().optional(),
});

const bodyZ = z.object({
  idFront: fileZ,
  idBack: fileZ,
  selfie: fileZ,
  extras: z.array(fileZ).optional(),
});

export async function POST(request) {
  try {
    const auth = await isAuthenticated("user");
    if (!auth.isAuth) return response(false, 403, "Unauthorized.");
    await connectDB();

    const payload = await request.json();
    const parsed = bodyZ.safeParse(payload);
    if (!parsed.success) return response(false, 400, "Invalid KYC payload.", parsed.error);

    // Upsert unless already verified
    const existing = await Kyc.findOne({ user: auth.userId, deletedAt: null });

    if (existing?.status === "verified") {
      return response(false, 409, "KYC already verified; updates are not allowed.");
    }

    const doc = await Kyc.findOneAndUpdate(
      { user: auth.userId, deletedAt: null },
      {
        user: auth.userId,
        status: "pending",
        docs: {
          idFront: parsed.data.idFront,
          idBack: parsed.data.idBack,
          selfie: parsed.data.selfie,
          extras: parsed.data.extras || [],
        },
        adminNote: null,
        verifiedBy: null,
        verifiedAt: null,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return response(true, 200, "KYC submitted. We'll review it soon.", doc);
  } catch (e) {
    return catchError(e);
  }
}
