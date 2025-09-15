import { isAuthenticated } from "@/lib/authentication";
import { connectDB } from "@/lib/databaseConnection";
import { catchError, response } from "@/lib/helperFunction";
import SupportTicket from "@/models/SupportTicket.model";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export async function GET(req, ctx) {
  try {
    const auth = await isAuthenticated("user");
    if (!auth.isAuth) return response(false, 401, "Unauthorized.");

    await connectDB();

    // Safely read id from context OR fallback from URL as last segment
    const id =
      ctx?.params?.id ||
      req?.nextUrl?.pathname?.split("/")?.filter(Boolean)?.pop();

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return response(false, 400, "Invalid id.");
    }

    const t = await SupportTicket.findOne({
      _id: new mongoose.Types.ObjectId(id),
      user: new mongoose.Types.ObjectId(auth.userId),
      deletedAt: null,
    }).lean();

    if (!t) return response(false, 404, "Ticket not found.");

    // Hide internal notes from member
    const notes = Array.isArray(t.notes) ? t.notes.filter((n) => !n.internal) : [];
    return NextResponse.json({ success: true, data: { ...t, notes } });
  } catch (e) {
    return catchError(e);
  }
}
