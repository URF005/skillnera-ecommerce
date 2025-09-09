import { isAuthenticated } from "@/lib/authentication";
import { connectDB } from "@/lib/databaseConnection";
import { catchError, response } from "@/lib/helperFunction";
import OrderModel from "@/models/Order.model";
import { createMLMCommissionsForOrder } from "@/lib/commission";

export async function PUT(request) {
  try {
    const auth = await isAuthenticated("admin");
    if (!auth.isAuth) {
      return response(false, 403, "Unauthorized.");
    }

    await connectDB();
    const { _id, status } = await request.json();

    if (!_id || !status) {
      return response(false, 400, "Order id and status are required.");
    }

    const orderData = await OrderModel.findById(_id);
    if (!orderData) {
      return response(false, 404, "Order not found.");
    }

    const prevStatus = String(orderData.status || "").toLowerCase();
    const nextStatus = String(status || "").toLowerCase();

    orderData.status = status;
    await orderData.save();

    // 🔔 Trigger commissions the first time an order enters a "finalized" state.
    // Supports your flow (delivered) + safe aliases.
    const TRIGGER_STATUSES = new Set(["delivered", "deliverd", "completed", "paid"]);

    if (TRIGGER_STATUSES.has(nextStatus) && !TRIGGER_STATUSES.has(prevStatus)) {
      const eligibleAmount = Number(orderData.subtotal ?? orderData.totalAmount ?? 0);
      try {
        await createMLMCommissionsForOrder(orderData, eligibleAmount);
      } catch (e) {
        console.error("MLM commission create error:", e);
        // Don't fail order update if MLM calc fails
      }
    }

    return response(true, 200, "Order status updated successfully.", orderData);
  } catch (error) {
    return catchError(error);
  }
}
