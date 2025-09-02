import { connectDB } from "@/lib/databaseConnection";
import { catchError, response } from "@/lib/helperFunction";
import { isAuthenticated } from "@/lib/authentication";
import { isValidObjectId } from "mongoose";
import MediaModel from "@/models/Media.model";
import ProductVariantModel from "@/models/ProductVariant.model";

export async function GET(request, { params }) {
    try {
        const auth = await isAuthenticated('admin')
        if (!auth.isAuth) {
            return response(false, 403, 'Unauthorized.')
        }

        await connectDB()

        const getParams = await params
        const id = getParams.id

        const filter = {
            deletedAt: null
        }

        if (!isValidObjectId(id)) {
            return response(false, 400, 'Invalid object id.')
        }

        filter._id = id

        const getProductVariant = await ProductVariantModel.findOne(filter).populate('media', '_id secure_url').lean()

        if (!getProductVariant) {
            return response(false, 404, 'Product variant not found.')
        }

        return response(true, 200, 'Product variant found.', getProductVariant)

    } catch (error) {
        return catchError(error)
    }
}