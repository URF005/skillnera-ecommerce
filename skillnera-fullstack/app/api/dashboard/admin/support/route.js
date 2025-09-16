import { isAuthenticated } from "@/lib/authentication";
import { connectDB } from "@/lib/databaseConnection";
import { catchError } from "@/lib/helperFunction";
import SupportTicket from "@/models/SupportTicket.model";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const auth = await isAuthenticated(["admin", "support"]);
    if (!auth.isAuth) return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 403 });
    await connectDB();

    const sp = req.nextUrl.searchParams;
    const start = parseInt(sp.get("start") || 0, 10);
    const size = parseInt(sp.get("size") || 10, 10);
    const filters = JSON.parse(sp.get("filters") || "[]");
    const globalFilter = (sp.get("globalFilter") || "").trim();
    const sorting = JSON.parse(sp.get("sorting") || "[]");
    const deleteType = sp.get("deleteType");
    const view = (sp.get("view") || "").trim(); // "in_process" | "resolved" | "all" | "my"
    const category = (sp.get("category") || "").trim();
    const priority = (sp.get("priority") || "").trim();

    const match = {};
    if (deleteType === "SD") match.deletedAt = null;
    else if (deleteType === "PD") match.deletedAt = { $ne: null };

    if (view === "resolved") match.status = "resolved";
    else if (view === "in_process") match.status = { $in: ["open", "in_process"] };
    else if (view === "my") match.assignedTo = auth.userId;

    if (category) match.category = category;
    if (priority) match.priority = priority;

    const sortQ = {};
    for (const s of sorting) sortQ[s.id] = s.desc ? -1 : 1;
    const finalSort = Object.keys(sortQ).length ? sortQ : { createdAt: -1 };

    const pipeline = [
      { $match: match },
      { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "userDoc" } },
      { $unwind: { path: "$userDoc", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "users", localField: "assignedTo", foreignField: "_id", as: "assigneeDoc" } },
      { $unwind: { path: "$assigneeDoc", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          userName: "$userDoc.name",
          userEmail: "$userDoc.email",
          userPhone: "$userDoc.phone",
          assigneeName: "$assigneeDoc.name",
          createdAtStr: { $toString: "$createdAt" },
          dueAtStr: { $toString: "$dueAt" },
          ticketNumberStr: "$ticketNumber",
          subjectStr: "$subject",
          statusStr: "$status",
          categoryStr: "$category",
          priorityStr: "$priority",
          relatedOrderIdStr: { $ifNull: ["$relatedOrderId", ""] },
        },
      },
    ];

    if (globalFilter) {
      const regex = new RegExp(globalFilter, "i");
      pipeline.push({
        $match: {
          $or: [
            { userName: regex }, { userEmail: regex }, { userPhone: regex },
            { assigneeName: regex }, { createdAtStr: regex }, { dueAtStr: regex },
            { ticketNumberStr: regex }, { subjectStr: regex }, { statusStr: regex },
            { categoryStr: regex }, { priorityStr: regex }, { relatedOrderIdStr: regex },
          ],
        },
      });
    }

    if (Array.isArray(filters) && filters.length) {
      const ands = [];
      for (const f of filters) {
        if (!f?.id) continue;
        ands.push({ [f.id]: { $regex: f.value, $options: "i" } });
      }
      if (ands.length) pipeline.push({ $match: { $and: ands } });
    }

    const project = {
      $project: {
        _id: 1,
        ticketNumber: 1,
        subject: 1,
        status: 1,
        category: 1,
        priority: 1,
        dueAt: 1,
        createdAt: 1,
        updatedAt: 1,
        userId: "$userDoc._id",
        userName: "$userDoc.name",
        userEmail: "$userDoc.email",
        userPhone: "$userDoc.phone",
        assigneeId: "$assigneeDoc._id",
        assigneeName: "$assigneeDoc.name",
        relatedOrderId: 1,
        relatedKycId: 1, // harmless if unused
      },
    };

    const dataPipeline = [...pipeline, { $sort: finalSort }, { $skip: start }, { $limit: size }, project];
    const countPipeline = [...pipeline, { $count: "total" }];

    const [rows, countArr] = await Promise.all([
      SupportTicket.aggregate(dataPipeline),
      SupportTicket.aggregate(countPipeline),
    ]);

    const totalRowCount = countArr?.[0]?.total || 0;
    return NextResponse.json({ success: true, data: rows, meta: { totalRowCount } });
  } catch (e) {
    return catchError(e);
  }
}
