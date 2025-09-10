import { isAuthenticated } from "@/lib/authentication";
import { connectDB } from "@/lib/databaseConnection";
import { catchError, response } from "@/lib/helperFunction";
import ReviewModel from "@/models/Review.model";
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

    // Base trash/active match
    let baseMatch = {};
    if (deleteType === "SD") baseMatch = { deletedAt: null };
    else if (deleteType === "PD") baseMatch = { deletedAt: { $ne: null } };

    // Map sorting to real field names (we'll add these via $addFields)
    const sortQuery = {};
    for (const s of sorting) {
      let key = s.id;
      if (key === "product") key = "productName";
      if (key === "user") key = "userName";
      // rating is numeric; others are strings
      sortQuery[key] = s.desc ? -1 : 1;
    }
    const finalSort = Object.keys(sortQuery).length ? sortQuery : { createdAt: -1 };

    // Build pipeline
    const pipeline = [
      { $match: baseMatch },
      // join product
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "productData",
        },
      },
      { $unwind: { path: "$productData", preserveNullAndEmptyArrays: true } },
      // join user
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userData",
        },
      },
      { $unwind: { path: "$userData", preserveNullAndEmptyArrays: true } },
      // add flat fields for search/sort
      {
        $addFields: {
          productName: "$productData.name",
          userName: "$userData.name",
          ratingStr: { $toString: "$rating" }, // for regex search
        },
      },
    ];

    // Global search (use ratingStr for number)
    if (globalFilter) {
      const regex = new RegExp(globalFilter, "i");
      pipeline.push({
        $match: {
          $or: [
            { productName: regex },
            { userName: regex },
            { ratingStr: regex },
            { title: regex },
            { review: regex },
          ],
        },
      });
    }

    // Column filters
    if (Array.isArray(filters) && filters.length) {
      const ands = [];
      for (const f of filters) {
        if (!f?.id) continue;
        if (f.id === "product") {
          ands.push({ productName: { $regex: f.value, $options: "i" } });
        } else if (f.id === "user") {
          ands.push({ userName: { $regex: f.value, $options: "i" } });
        } else if (f.id === "rating") {
          // allow numeric exact or regex text
          const asNum = Number(f.value);
          if (!Number.isNaN(asNum)) {
            ands.push({ rating: asNum });
          } else {
            ands.push({ ratingStr: { $regex: f.value, $options: "i" } });
          }
        } else {
          ands.push({ [f.id]: { $regex: f.value, $options: "i" } });
        }
      }
      if (ands.length) pipeline.push({ $match: { $and: ands } });
    }

    // Projection for table columns
    const projectStage = {
      $project: {
        _id: 1,
        product: "$productName",
        user: "$userName",
        rating: 1,
        review: 1,
        title: 1,
        createdAt: 1,
        updatedAt: 1,
        deletedAt: 1,
      },
    };

    const dataPipeline = [...pipeline, { $sort: finalSort }, { $skip: start }, { $limit: size }, projectStage];
    const countPipeline = [...pipeline, { $count: "total" }];

    const [rows, countArr] = await Promise.all([
      ReviewModel.aggregate(dataPipeline),
      ReviewModel.aggregate(countPipeline),
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
