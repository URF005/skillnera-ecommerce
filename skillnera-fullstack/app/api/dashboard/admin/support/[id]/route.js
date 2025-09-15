import { isAuthenticated } from "@/lib/authentication";
import { connectDB } from "@/lib/databaseConnection";
import { catchError, response } from "@/lib/helperFunction";
import SupportTicket from "@/models/SupportTicket.model";
import mongoose from "mongoose";
import { z } from "zod";
import {
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
  SUPPORT_OUTCOMES,
  computeDueAt,
} from "@/lib/support";
import { NextResponse } from "next/server";

const AttachmentZ = z.object({
  url: z.string().url(),
  public_id: z.string().optional(),
  type: z.string().optional(),
  name: z.string().optional(),
  size: z.number().optional(),
});

const UpdateZ = z.object({
  assignTo: z.string().length(24).optional(),
  status: z.enum(SUPPORT_STATUSES).optional(),
  priority: z.enum(SUPPORT_PRIORITIES).optional(),
  category: z.enum(SUPPORT_CATEGORIES).optional(),
  relatedOrderId: z.string().optional(),
  // add note (internal or member-visible)
  addNote: z.object({
    message: z.string().min(1),
    internal: z.boolean().default(true),
    attachments: z.array(AttachmentZ).optional(),
  }).optional(),
  // resolution when resolving
  resolution: z.object({
    outcome: z.enum(SUPPORT_OUTCOMES),
    details: z.string().optional(),
    refundAmount: z.number().nonnegative().optional(),
    replacementOrderId: z.string().optional(),
    pointsDelta: z.number().optional(),
  }).optional(),
});

export async function GET(_req, { params }) {
  try {
    const auth = await isAuthenticated("admin");
    if (!auth.isAuth) return response(false, 403, "Unauthorized.");
    await connectDB();

    const id = params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return response(false, 400, "Invalid id.");

    const t = await SupportTicket.findById(id)
      .populate("user", "name email phone")
      .populate("assignedTo", "name email")
      .lean();

    if (!t) return response(false, 404, "Ticket not found.");
    return NextResponse.json({ success: true, data: t });
  } catch (e) {
    return catchError(e);
  }
}

export async function PUT(req, { params }) {
  try {
    const auth = await isAuthenticated("admin");
    if (!auth.isAuth) return response(false, 403, "Unauthorized.");
    await connectDB();

    const id = params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return response(false, 400, "Invalid id.");

    const body = await req.json();
    const parsed = UpdateZ.safeParse(body);
    if (!parsed.success) return response(false, 400, "Invalid input.", parsed.error);

    const data = parsed.data;
    const updates = {};
    const auditEntries = [];

    if (data.assignTo) {
      updates.assignedTo = new mongoose.Types.ObjectId(data.assignTo);
      // auto move to in_process if currently open
      updates.status = "in_process";
      auditEntries.push({ by: auth.userId, action: "assigned", meta: { to: data.assignTo } });
    }

    if (data.priority) {
      updates.priority = data.priority;
      auditEntries.push({ by: auth.userId, action: "priority_change", meta: { priority: data.priority } });
    }

    if (data.category) {
      updates.category = data.category;
      updates.dueAt = computeDueAt(data.category); // recompute SLA due
      auditEntries.push({ by: auth.userId, action: "category_change", meta: { category: data.category } });
    }

    if (data.relatedOrderId !== undefined) {
      updates.relatedOrderId = data.relatedOrderId || null;
      auditEntries.push({ by: auth.userId, action: "link_order", meta: { order_id: data.relatedOrderId } });
    }


    if (data.addNote) {
      const note = {
        by: auth.userId,
        internal: data.addNote.internal ?? true,
        message: data.addNote.message,
        attachments: data.addNote.attachments || [],
        createdAt: new Date(),
      };
      await SupportTicket.updateOne(
        { _id: id, deletedAt: null },
        {
          $push: {
            notes: note,
            audit: { at: new Date(), by: auth.userId, action: "note_added", meta: { internal: note.internal } },
          },
        }
      );
    }

    if (data.status) {
      updates.status = data.status;
      auditEntries.push({ by: auth.userId, action: "status_change", meta: { status: data.status } });
    }

    if (data.resolution && (data.status === "resolved" || !data.status)) {
      // set resolution + resolve
      updates.status = "resolved";
      updates["resolution.outcome"] = data.resolution.outcome;
      if (data.resolution.details) updates["resolution.details"] = data.resolution.details;
      if (data.resolution.refundAmount !== undefined) updates["resolution.refundAmount"] = data.resolution.refundAmount;
      if (data.resolution.replacementOrderId !== undefined) updates["resolution.replacementOrderId"] = data.resolution.replacementOrderId;
      if (data.resolution.pointsDelta !== undefined) updates["resolution.pointsDelta"] = data.resolution.pointsDelta;
      updates["resolution.resolvedBy"] = new mongoose.Types.ObjectId(auth.userId);
      updates["resolution.resolvedAt"] = new Date();
      auditEntries.push({ by: auth.userId, action: "resolved", meta: { outcome: data.resolution.outcome } });
    }
    if (data.assignTo) {
      // allow special "me"
      const assigneeId = data.assignTo === "me" ? auth.userId : data.assignTo;
      updates.assignedTo = new mongoose.Types.ObjectId(assigneeId);
      // auto move to in_process if currently open
      updates.status = "in_process";
      auditEntries.push({ by: auth.userId, action: "assigned", meta: { to: assigneeId } });
    }


    if (Object.keys(updates).length > 0 || auditEntries.length > 0) {
      await SupportTicket.updateOne(
        { _id: id, deletedAt: null },
        {
          $set: updates,
          $push: { audit: { $each: auditEntries.map(a => ({ ...a, at: new Date() })) } },
        }
      );
    }

    return response(true, 200, "Ticket updated.");
  } catch (e) {
    return catchError(e);
  }
}
