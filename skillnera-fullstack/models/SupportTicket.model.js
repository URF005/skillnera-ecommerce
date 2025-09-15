import mongoose from "mongoose";
import {
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
  SUPPORT_OUTCOMES,
  computeDueAt,
} from "@/lib/support.js";

const AttachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    public_id: { type: String, required: false, trim: true },
    type: { type: String, required: false, trim: true }, // "image", "pdf", ...
    name: { type: String, required: false, trim: true },
    size: { type: Number, required: false }, // bytes
  },
  { _id: false }
);

const NoteSchema = new mongoose.Schema(
  {
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    internal: { type: Boolean, default: true }, // true = internal note (hidden from member)
    message: { type: String, required: true, trim: true },
    attachments: { type: [AttachmentSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ResolutionSchema = new mongoose.Schema(
  {
    outcome: { type: String, enum: SUPPORT_OUTCOMES, required: false },
    details: { type: String, required: false, trim: true },
    // optional links to operational actions:
    refundAmount: { type: Number, required: false },
    replacementOrderId: { type: String, required: false, trim: true }, // your Order.order_id
    pointsDelta: { type: Number, required: false }, // for point/commission adjustments
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    resolvedAt: { type: Date, required: false },
  },
  { _id: false }
);

const SupportTicketSchema = new mongoose.Schema(
  {
    // Who opened the ticket
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // Identification
    ticketNumber: { type: String, required: true, unique: true },

    // Core fields
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, enum: SUPPORT_CATEGORIES, required: true, index: true },
    priority: { type: String, enum: SUPPORT_PRIORITIES, required: true, default: "Medium", index: true },

    // Status & SLA
    status: { type: String, enum: SUPPORT_STATUSES, required: true, default: "open", index: true },
    dueAt: { type: Date, required: true }, // computed from category + createdAt
    slaBreachedAt: { type: Date, default: null, index: true },

    // Linking
    relatedOrderId: { type: String, required: false, trim: true },    // Order.order_id (string)


    // Ownership / Assignment
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false, index: true },

    // Attachments visible to member
    attachments: { type: [AttachmentSchema], default: [] },

    // Notes (internal + member-visible if we want later)
    notes: { type: [NoteSchema], default: [] },

    // Resolution
    resolution: { type: ResolutionSchema, default: {} },

    // Audit log
    audit: {
      type: [
        {
          at: { type: Date, default: Date.now },
          by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          action: { type: String, trim: true }, // e.g. "status_change", "assigned", "note_added", "created"
          meta: { type: mongoose.Schema.Types.Mixed },
        },
      ],
      default: [],
    },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

// Generate a friendly ticket number before first save
SupportTicketSchema.pre("validate", function (next) {
  if (!this.ticketNumber) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    this.ticketNumber = `TCK-${y}${m}${d}-${rand}`;
  }
  next();
});

// Set dueAt from category SLA on create
SupportTicketSchema.pre("validate", function (next) {
  if (!this.dueAt) {
    this.dueAt = computeDueAt(this.category, this.createdAt || new Date());
  }
  next();
});

// Maintain SLA breach timestamp
SupportTicketSchema.pre("save", function (next) {
  if (this.status === "resolved" || this.status === "closed") {
    // finalize breach timestamp if overdue
    if (!this.slaBreachedAt && this.dueAt && new Date() > this.dueAt) {
      this.slaBreachedAt = new Date();
    }
  }
  next();
});


SupportTicketSchema.index({ user: 1, status: 1 });
SupportTicketSchema.index({ category: 1, priority: 1, status: 1 });

const SupportTicket =
  mongoose.models.SupportTicket ||
  mongoose.model("SupportTicket", SupportTicketSchema, "support_tickets");

export default SupportTicket;
