import { isAuthenticated } from "@/lib/authentication"
import { connectDB } from "@/lib/databaseConnection"
import { catchError } from "@/lib/helperFunction"
import UserModel from "@/models/User.model"

import { NextResponse } from "next/server"

export async function GET(request) {
    try {
        const auth = await isAuthenticated('admin')
        if (!auth.isAuth) {
            return response(false, 403, 'Unauthorized.')
        }

        await connectDB()

        const searchParams = request.nextUrl.searchParams

        // Extract query parameters 
        const start = parseInt(searchParams.get('start') || 0, 10)
        const size = parseInt(searchParams.get('size') || 10, 10)
        const filters = JSON.parse(searchParams.get('filters') || "[]")
        const globalFilter = searchParams.get('globalFilter') || ""
        const sorting = JSON.parse(searchParams.get('sorting') || "[]")
        const deleteType = searchParams.get('deleteType')

        // Build match query  
        let matchQuery = {}

        if (deleteType === 'SD') {
            matchQuery = { deletedAt: null }
        } else if (deleteType === 'PD') {
            matchQuery = { deletedAt: { $ne: null } }
        }

        // Global search 
        if (globalFilter) {
            matchQuery["$or"] = [
                { name: { $regex: globalFilter, $options: 'i' } },
                { email: { $regex: globalFilter, $options: 'i' } },
                { phone: { $regex: globalFilter, $options: 'i' } },
                { address: { $regex: globalFilter, $options: 'i' } },
                { isEmailVerified: { $regex: globalFilter, $options: 'i' } },
            ]
        }

        //  Column filteration  

        filters.forEach(filter => {
            matchQuery[filter.id] = { $regex: filter.value, $options: 'i' }
        });

        //   Sorting  
        let sortQuery = {}
        sorting.forEach(sort => {
            sortQuery[sort.id] = sort.desc ? -1 : 1
        });


        // Aggregate pipeline  

        const aggregatePipeline = [

            { $match: matchQuery },
            { $sort: Object.keys(sortQuery).length ? sortQuery : { createdAt: -1 } },
            { $skip: start },
            { $limit: size },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    email: 1,
                    phone: 1,
                    address: 1,
                    avatar: 1,
                    isEmailVerified: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    deletedAt: 1
                }
            }
        ]

        // Execute query  

        const getcustomers = await UserModel.aggregate(aggregatePipeline)

        // Get totalRowCount  
        const totalRowCount = await UserModel.countDocuments(matchQuery)

        return NextResponse.json({
            success: true,
            data: getcustomers,
            meta: { totalRowCount }
        })

    } catch (error) {
        return catchError(error)
    }
}