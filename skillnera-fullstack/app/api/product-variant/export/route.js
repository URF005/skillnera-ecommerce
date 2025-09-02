import { connectDB } from "@/lib/databaseConnection";
import { catchError, response } from "@/lib/helperFunction";
import { isAuthenticated } from "@/lib/authentication";
import ProductVariantModel from "@/models/ProductVariant.model";

export async function GET(request) {
    try {
        const auth = await isAuthenticated('admin')
        if (!auth.isAuth) {
            return response(false, 403, 'Unauthorized.')
        }

        await connectDB()

        const filter = {
            deletedAt: null
        }

        const getProductVariant = await ProductVariantModel.find(filter).select('-media').sort({ createdAt: -1 }).lean()

        if (!getProductVariant) {
            return response(false, 404, 'Collection empty.')
        }

        return response(true, 200, 'Data found.', getProductVariant)


    } catch (error) {
        return catchError(error)
    }
}