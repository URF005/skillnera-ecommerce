import { isAuthenticated } from "@/lib/authentication";
import { connectDB } from "@/lib/databaseConnection";
import { catchError, response } from "@/lib/helperFunction";
import Kyc from "@/models/Kyc.model";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const auth = await isAuthenticated("admin");
    if (!auth.isAuth) return response(false, 403, "Unauthorized.");
    await connectDB();

    const sp = request.nextUrl.searchParams;
    const start = parseInt(sp.get("start") || 0, 10);
    const size = parseInt(sp.get("size") || 10, 10);
    const filters = JSON.parse(sp.get("filters") || "[]");
    const globalFilter = (sp.get("globalFilter") || "").trim();
    const sorting = JSON.parse(sp.get("sorting") || "[]");
    const deleteType = sp.get("deleteType");
    const status = (sp.get("status") || "").trim(); // optional: pending/verified/unverified

    // Base match
    const baseMatch = {};
    if (deleteType === "SD") baseMatch.deletedAt = null;
    else if (deleteType === "PD") baseMatch.deletedAt = { $ne: null };
    if (status) baseMatch.status = status;

    // Sorting
    const sortQ = {};
    for (const s of sorting) sortQ[s.id] = s.desc ? -1 : 1;
    const finalSort = Object.keys(sortQ).length ? sortQ : { createdAt: -1 };

    const pipeline = [
      { $match: baseMatch },

      // Join user for display/search
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDoc",
        },
      },
      { $unwind: { path: "$userDoc", preserveNullAndEmptyArrays: true } },

      // Join orders (may be empty)
      {
        $lookup: {
          from: "orders",
          localField: "user",
          foreignField: "user",
          as: "orderDocs",
        },
      },

      // Compute safe counts
      {
        $addFields: {
          userName: "$userDoc.name",
          userEmail: "$userDoc.email",
          userPhone: "$userDoc.phone",
          statusStr: "$status",
          createdAtStr: { $toString: "$createdAt" },

          // ensure array
          orderDocsSafe: { $ifNull: ["$orderDocs", []] },

          // total orders
          orderCount: { $size: { $ifNull: ["$orderDocs", []] } },

          // delivered orders (case-insensitive, guard null status)
          deliveredOrders: {
            $filter: {
              input: { $ifNull: ["$orderDocs", []] },
              as: "o",
              cond: {
                $in: [
                  {
                    $toLower: {
                      $ifNull: ["$$o.status", ""], // ✅ null-safe
                    },
                  },
                  ["delivered", "deliverd", "paid", "completed"],
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          deliveredCount: { $size: "$deliveredOrders" },
          orderCountStr: { $toString: { $size: { $ifNull: ["$orderDocs", []] } } },
          deliveredCountStr: { $toString: { $size: "$deliveredOrders" } },
        },
      },
    ];

    // Global search
    if (globalFilter) {
      const regex = new RegExp(globalFilter, "i");
      pipeline.push({
        $match: {
          $or: [
            { userName: regex },
            { userEmail: regex },
            { userPhone: regex },
            { statusStr: regex },
            { createdAtStr: regex },
            { orderCountStr: regex },
            { deliveredCountStr: regex },
          ],
        },
      });
    }

    // Column filters
    if (Array.isArray(filters) && filters.length) {
      const ands = [];
      for (const f of filters) {
        if (!f?.id) continue;

        if (["userName", "userEmail", "userPhone", "status"].includes(f.id)) {
          const field = f.id === "status" ? "statusStr" : f.id;
          ands.push({ [field]: { $regex: f.value, $options: "i" } });
        } else if (f.id === "orderCount" || f.id === "deliveredCount") {
          const n = Number(f.value);
          if (!Number.isNaN(n)) {
            ands.push({ [f.id]: n });
          } else {
            const strField = f.id === "orderCount" ? "orderCountStr" : "deliveredCountStr";
            ands.push({ [strField]: { $regex: f.value, $options: "i" } });
          }
        } else {
          ands.push({ [f.id]: { $regex: f.value, $options: "i" } });
        }
      }
      if (ands.length) pipeline.push({ $match: { $and: ands } });
    }

    // Flat projection
    const projectStage = {
      $project: {
        _id: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,

        userId: "$userDoc._id",
        userName: "$userDoc.name",
        userEmail: "$userDoc.email",
        userPhone: "$userDoc.phone",

        idFrontUrl: "$docs.idFront.url",
        idBackUrl: "$docs.idBack.url",
        selfieUrl: "$docs.selfie.url",

        orderCount: 1,
        deliveredCount: 1,
      },
    };

    const dataPipeline = [...pipeline, { $sort: finalSort }, { $skip: start }, { $limit: size }, projectStage];
    const countPipeline = [...pipeline, { $count: "total" }];

    const [rows, countArr] = await Promise.all([
      Kyc.aggregate(dataPipeline),
      Kyc.aggregate(countPipeline),
    ]);
    const totalRowCount = countArr?.[0]?.total || 0;

    return NextResponse.json({ success: true, data: rows, meta: { totalRowCount } });
  } catch (e) {
    return catchError(e);
  }
}
