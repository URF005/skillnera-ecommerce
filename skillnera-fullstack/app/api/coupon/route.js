import { isAuthenticated } from "@/lib/authentication";
import { connectDB } from "@/lib/databaseConnection";
import { catchError, response } from "@/lib/helperFunction";
import CouponModel from "@/models/Coupon.model";
import { NextResponse } from "next/server";

function parseDateInput(v) {
  // supports: "2025-09-01", "2025-09-01 to 2025-09-30"
  if (!v) return null;
  const s = String(v).trim();
  const parts = s.split(/\s+to\s+/i);
  if (parts.length === 2) {
    const from = new Date(parts[0]);
    const to = new Date(parts[1]);
    if (!isNaN(from) && !isNaN(to)) return { $gte: from, $lte: to };
  }
  const d = new Date(s);
  if (!isNaN(d)) return d;
  return null;
}

export async function GET(request) {
  try {
    const auth = await isAuthenticated("admin");
    if (!auth.isAuth) {
      return response(false, 403, "Unauthorized.");
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;

    // Extract query parameters
    const start = parseInt(searchParams.get("start") || 0, 10);
    const size = parseInt(searchParams.get("size") || 10, 10);
    const filters = JSON.parse(searchParams.get("filters") || "[]");
    const globalFilter = (searchParams.get("globalFilter") || "").trim();
    const sorting = JSON.parse(searchParams.get("sorting") || "[]");
    const deleteType = searchParams.get("deleteType");

    // Base match (trash vs active)
    let baseMatch = {};
    if (deleteType === "SD") baseMatch = { deletedAt: null };
    else if (deleteType === "PD") baseMatch = { deletedAt: { $ne: null } };

    // Sorting
    const sortQuery = {};
    for (const s of sorting) sortQuery[s.id] = s.desc ? -1 : 1;
    const finalSort = Object.keys(sortQuery).length ? sortQuery : { createdAt: -1 };

    // Build pipeline
    const pipeline = [{ $match: baseMatch }];

    // Add string versions so regex works on numbers/dates in global search
    pipeline.push({
      $addFields: {
        discountPercentageStr: { $toString: "$discountPercentage" },
        minShoppingAmountStr: { $toString: "$minShoppingAmount" },
        validityStr: {
          $dateToString: { format: "%Y-%m-%d", date: "$validity" },
        },
      },
    });

    // Global search across code, numbers-as-string, and date-as-string
    if (globalFilter) {
      const regex = new RegExp(globalFilter, "i");
      pipeline.push({
        $match: {
          $or: [
            { code: regex },
            { discountPercentageStr: regex },
            { minShoppingAmountStr: regex },
            { validityStr: regex },
          ],
        },
      });
    }

    // Column filters (typed)
    if (Array.isArray(filters) && filters.length) {
      const ands = [];
      for (const f of filters) {
        if (!f?.id) continue;
        if (f.id === "discountPercentage" || f.id === "minShoppingAmount") {
          const n = Number(f.value);
          if (!Number.isNaN(n)) {
            ands.push({ [f.id]: n });
          } else {
            const strField =
              f.id === "discountPercentage" ? "discountPercentageStr" : "minShoppingAmountStr";
            ands.push({ [strField]: { $regex: f.value, $options: "i" } });
          }
        } else if (f.id === "validity") {
          const d = parseDateInput(f.value);
          if (d) {
            ands.push({ validity: d });
          } else {
            ands.push({ validityStr: { $regex: f.value, $options: "i" } });
          }
        } else {
          ands.push({ [f.id]: { $regex: f.value, $options: "i" } });
        }
      }
      if (ands.length) pipeline.push({ $match: { $and: ands } });
    }

    // Projection for table
    const projectStage = {
      $project: {
        _id: 1,
        code: 1,
        discountPercentage: 1,
        minShoppingAmount: 1,
        validity: 1,
        createdAt: 1,
        updatedAt: 1,
        deletedAt: 1,
      },
    };

    // Data & Count pipelines
    const dataPipeline = [...pipeline, { $sort: finalSort }, { $skip: start }, { $limit: size }, projectStage];
    const countPipeline = [...pipeline, { $count: "total" }];

    const [rows, countArr] = await Promise.all([
      CouponModel.aggregate(dataPipeline),
      CouponModel.aggregate(countPipeline),
    ]);

    const totalRowCount = countArr?.[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: rows,
      meta: { totalRowCount },
    });
  } catch (error) {
    return catchError(error);
  }
}
