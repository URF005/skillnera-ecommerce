import { isAuthenticated } from "@/lib/authentication";
import { connectDB } from "@/lib/databaseConnection";
import { catchError, response } from "@/lib/helperFunction";
import SupportTicket from "@/models/SupportTicket.model";
import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES } from "@/lib/support";
import { NextResponse } from "next/server";
import { z } from "zod";

const AttachmentZ = z.object({
  url: z.string().url(),
  public_id: z.string().optional(),
  type: z.string().optional(),
  name: z.string().optional(),
  size: z.number().optional(),
});

const CreateZ = z.object({
  subject: z.string().min(5),
  description: z.string().min(5),
  category: z.enum(SUPPORT_CATEGORIES),
  priority: z.enum(SUPPORT_PRIORITIES).default("Medium"),
  relatedOrderId: z.string().optional(),
  relatedKycId: z.string().length(24).optional(),
  attachments: z.array(AttachmentZ).optional(),
});

export async function POST(req) {
  try {
    const auth = await isAuthenticated("user");
    if (!auth.isAuth) return response(false, 401, "Unauthorized.");

    await connectDB();
    const payload = await req.json();
    const parsed = CreateZ.safeParse(payload);
    if (!parsed.success) {
      return response(false, 400, "Invalid input.", parsed.error);
    }

    const data = parsed.data;
    const ticket = new SupportTicket({
      user: auth.userId,
      subject: data.subject,
      description: data.description,
      category: data.category,
      priority: data.priority,
      relatedOrderId: data.relatedOrderId || null,
      relatedKycId: data.relatedKycId || null,
      attachments: data.attachments || [],
      audit: [{ by: auth.userId, action: "created", meta: {} }],
    });

    await ticket.save();
    return response(true, 201, "Ticket created.", { ticketNumber: ticket.ticketNumber, _id: ticket._id });
  } catch (e) {
    return catchError(e);
  }
}

// List my tickets (simple, no heavy datatable params)
export async function GET(req) {
  try {
    const auth = await isAuthenticated("user");
    if (!auth.isAuth) return response(false, 401, "Unauthorized.");

    await connectDB();
    const sp = req.nextUrl.searchParams;
    const status = sp.get("status") || ""; // optional
    const category = sp.get("category") || ""; // optional

    const match = { user: auth.userId, deletedAt: null };
    if (status) match.status = status;
    if (category) match.category = category;

    const rows = await SupportTicket.find(match)
      .sort({ createdAt: -1 })
      .select("_id ticketNumber subject status category priority createdAt dueAt relatedOrderId")
      .lean();

    return NextResponse.json({ success: true, data: rows });
  } catch (e) {
    return catchError(e);
  }
}
