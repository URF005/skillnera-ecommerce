// app/api/payment/save-order/route.js
import { orderNotification } from "@/email/orderNotification";
import { connectDB } from "@/lib/databaseConnection";
import { catchError, response } from "@/lib/helperFunction";
import { sendMail } from "@/lib/sendMail";
import { zSchema } from "@/lib/zodSchema";
import OrderModel from "@/models/Order.model";
import { z } from "zod";
import mongoose from "mongoose";

export async function POST(request) {
    try {
        await connectDB();
        const payload = await request.json();

        const productSchema = z.object({
            productId: z.string().length(24, 'Invalid product id format'),
            variantId: z.string().length(24, 'Invalid variant id format'),
            name: z.string().min(1),
            qty: z.number().min(1),
            mrp: z.number().nonnegative(),
            sellingPrice: z.number().nonnegative()
        });

        const orderSchema = zSchema.pick({
            name: true, email: true, phone: true, country: true, state: true, city: true, pincode: true, landmark: true, ordernote: true
        }).extend({
            userId: z.string().optional(),
            subtotal: z.number().nonnegative(),
            discount: z.number().nonnegative(),
            couponDiscountAmount: z.number().nonnegative(),
            totalAmount: z.number().nonnegative(),
            products: z.array(productSchema)
        });

        const validate = orderSchema.safeParse(payload);
        if (!validate.success) {
            return response(false, 400, 'Invalid or missing fields.', { error: validate.error });
        }

        const validatedData = validate.data;

        // Generate a unique order_id (using MongoDB ObjectId)
        const orderId = new mongoose.Types.ObjectId().toString();

        let newOrder = new OrderModel({
            user: validatedData.userId,
            name: validatedData.name,
            email: validatedData.email,
            phone: validatedData.phone,
            country: validatedData.country,
            state: validatedData.state,
            city: validatedData.city,
            pincode: validatedData.pincode,
            landmark: validatedData.landmark,
            ordernote: validatedData.ordernote,
            products: validatedData.products,
            discount: validatedData.discount,
            couponDiscountAmount: validatedData.couponDiscountAmount,
            totalAmount: validatedData.totalAmount,
            subtotal: validatedData.subtotal,
            payment_id: 'manual',
            order_id: orderId, // Set order_id before saving
            status: 'pending'
        });

        await newOrder.save();

        try {
            const mailData = {
                order_id: newOrder.order_id,
                orderDetailsUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/order-details/${newOrder.order_id}`
            };

            await sendMail('Order placed successfully! Please check your email inbox, spam, and trash folders for confirmation..', validatedData.email, orderNotification(mailData));
        } catch (error) {
            console.log('Email error:', error);
        }

        return response(true, 200, 'Order placed successfully! Please check your email inbox, spam, and trash folders for confirmation..', { order_id: newOrder.order_id });

    } catch (error) {
        return catchError(error);
    }
}