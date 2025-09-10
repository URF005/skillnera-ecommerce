import { isAuthenticated } from "@/lib/authentication";
import { connectDB } from "@/lib/databaseConnection";
import { catchError, response } from "@/lib/helperFunction";
import UserModel from "@/models/User.model";
import { NextResponse } from "next/server";

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

    // Cast booleans/numbers to strings for regex search
    pipeline.push({
      $addFields: {
        isEmailVerifiedStr: { $toString: "$isEmailVerified" },
        createdAtStr: { $toString: "$createdAt" },
      },
    });

    // Global search across multiple fields (including casted boolean and referralCode)
    if (globalFilter) {
      const regex = new RegExp(globalFilter, "i");
      pipeline.push({
        $match: {
          $or: [
            { name: regex },
            { email: regex },
            { phone: regex },
            { address: regex },
            { referralCode: regex },
            { isEmailVerifiedStr: regex },
          ],
        },
      });
    }

    // Column filtering
    if (Array.isArray(filters) && filters.length) {
      const ands = [];
      for (const f of filters) {
        if (!f?.id) continue;
        if (f.id === "isEmailVerified") {
          const v = String(f.value || "").toLowerCase();
          if (["true", "1", "yes", "verified"].includes(v)) ands.push({ isEmailVerified: true });
          else if (["false", "0", "no", "unverified"].includes(v)) ands.push({ isEmailVerified: false });
          else ands.push({ isEmailVerifiedStr: { $regex: f.value, $options: "i" } });
        } else {
          ands.push({ [f.id]: { $regex: f.value, $options: "i" } });
        }
      }
      if (ands.length) pipeline.push({ $match: { $and: ands } });
    }

    // Project only needed fields
    pipeline.push({
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        phone: 1,
        address: 1,
        avatar: 1,
        isEmailVerified: 1,
        referralCode: 1,
        createdAt: 1,
        updatedAt: 1,
        deletedAt: 1,
      },
    });

    // Data + pagination
    const dataPipeline = [...pipeline, { $sort: finalSort }, { $skip: start }, { $limit: size }];

    // Count with same filters
    const countPipeline = [...pipeline, { $count: "total" }];

    const [rows, countArr] = await Promise.all([
      UserModel.aggregate(dataPipeline),
      UserModel.aggregate(countPipeline),
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
