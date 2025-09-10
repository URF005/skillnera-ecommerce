import { isAuthenticated } from "@/lib/authentication";
import { connectDB } from "@/lib/databaseConnection";
import { catchError, response } from "@/lib/helperFunction";
import OrderModel from "@/models/Order.model";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const auth = await isAuthenticated("admin");
    if (!auth.isAuth) {
      return response(false, 403, "Unauthorized.");
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;

    // query params
    const start = parseInt(searchParams.get("start") || 0, 10);
    const size = parseInt(searchParams.get("size") || 10, 10);
    const filters = JSON.parse(searchParams.get("filters") || "[]");
    const globalFilter = searchParams.get("globalFilter") || "";
    const sorting = JSON.parse(searchParams.get("sorting") || "[]");
    const deleteType = searchParams.get("deleteType");

    // base match (trash vs normal)
    let baseMatch = {};
    if (deleteType === "SD") baseMatch = { deletedAt: null };
    else if (deleteType === "PD") baseMatch = { deletedAt: { $ne: null } };

    // build regex once
    const gf = globalFilter?.trim();
    const hasGF = !!gf;
    const regex = hasGF ? new RegExp(gf, "i") : null;

    // column filters (order fields only; unchanged)
    const columnMatch = {};
    for (const f of filters) {
      columnMatch[f.id] = { $regex: f.value, $options: "i" };
    }

    // sorting
    const sortQuery = {};
    for (const s of sorting) {
      sortQuery[s.id] = s.desc ? -1 : 1;
    }
    const finalSort = Object.keys(sortQuery).length ? sortQuery : { createdAt: -1 };

    // ---- AGGREGATION ----
    // 1) filter by base trash state
    const pipeline = [{ $match: baseMatch }];

    // 2) join user so we can search by user fields
    pipeline.push(
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDoc",
        },
      },
      { $unwind: { path: "$userDoc", preserveNullAndEmptyArrays: true } }
    );

    // 3) add string versions of numeric fields so regex works there too (optional but handy)
    pipeline.push({
      $addFields: {
        discountStr: { $toString: "$discount" },
        couponDiscountAmountStr: { $toString: "$couponDiscountAmount" },
        totalAmountStr: { $toString: "$totalAmount" },
      },
    });

    // 4) global search across both order fields AND user fields
    if (hasGF) {
      pipeline.push({
        $match: {
          $or: [
            // order document fields
            { order_id: regex },
            { payment_id: regex },
            { name: regex },
            { email: regex },
            { phone: regex },
            { country: regex },
            { state: regex },
            { city: regex },
            { pincode: regex },
            { status: regex },
            { discountStr: regex },
            { couponDiscountAmountStr: regex },
            { totalAmountStr: regex },
            // linked user fields (for searching by account)
            { "userDoc.name": regex },
            { "userDoc.email": regex },
            { "userDoc.phone": regex },
          ],
        },
      });
    }

    // 5) apply column filters (order fields as before)
    if (Object.keys(columnMatch).length) {
      pipeline.push({ $match: columnMatch });
    }

    // 6) sorting + pagination
    const dataPipeline = [
      ...pipeline,
      { $sort: finalSort },
      { $skip: start },
      { $limit: size },
    ];

    // 7) count pipeline (same filters, no skip/limit)
    const countPipeline = [...pipeline, { $count: "total" }];

    // Execute
    const [rows, countArr] = await Promise.all([
      OrderModel.aggregate(dataPipeline),
      OrderModel.aggregate(countPipeline),
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
