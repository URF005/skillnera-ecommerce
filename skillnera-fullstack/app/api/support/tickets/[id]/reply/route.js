import { isAuthenticated } from "@/lib/authentication";
import { connectDB } from "@/lib/databaseConnection";
import { catchError, response } from "@/lib/helperFunction";
import SupportTicket from "@/models/SupportTicket.model";
import mongoose from "mongoose";
import { z } from "zod";

const AttachmentZ = z.object({
  url: z.string().url(),
  public_id: z.string().optional(),
  type: z.string().optional(),
  name: z.string().optional(),
  size: z.number().optional(),
});

const BodyZ = z.object({
  message: z.string().min(1),
  attachments: z.array(AttachmentZ).optional(),
});

export async function POST(req, { params }) {
  try {
    const auth = await isAuthenticated("user");
    if (!auth.isAuth) return response(false, 401, "Unauthorized.");
    await connectDB();

    // Await params to correctly access the id
    const { id } = await params; // Awaiting params

    if (!mongoose.Types.ObjectId.isValid(id)) return response(false, 400, "Invalid id.");

    const parsed = BodyZ.safeParse(await req.json());
    if (!parsed.success) return response(false, 400, "Invalid input.", parsed.error);

    const note = {
      by: auth.userId,
      internal: false,
      message: parsed.data.message,
      attachments: parsed.data.attachments || [],
      createdAt: new Date(),
    };

    const t = await SupportTicket.findOneAndUpdate(
      { _id: id, user: auth.userId, deletedAt: null },
      { $push: { notes: note, audit: { at: new Date(), by: auth.userId, action: "note_added", meta: { internal: false } } } },
      { new: true }
    ).lean();

    if (!t) return response(false, 404, "Ticket not found.");
    return response(true, 200, "Reply added.");
  } catch (e) {
    return catchError(e);
  }
}
