import crypto from "crypto";
import User from "../models/User.js";
import Order from "../models/Order.js";
import { sendEmail } from "../sendEmail.js";
export const handleWebhook = async (req, res) => {
    try {
        console.log("webhook recieved")
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        const signature = req.headers["x-razorpay-signature"];

        const expectedSignature = crypto
            .createHmac("sha256", webhookSecret)
            .update(req.body)
            .digest("hex");

        if (signature !== expectedSignature) {
            return res.status(400).json({ message: "Invalid webhook signature" });
        }

        const event = JSON.parse(req.body.toString());

        if (event.event === "payment.captured") {

            const payment = event.payload.payment.entity;

            const order = await Order.findOne({
                razorpay_order_id: payment.order_id
            });

            if (!order || order.status === "paid") {
                return res.status(200).json({ status: "Webhook already processed" });
            }

            order.status = "paid";
            order.paymentStatus = "paid";
            order.razorpay_payment_id = payment.id;
            if (order.type === "asset") {
                order.orderStatus = order.deliveryType === "digital" ? "completed" : "placed";
                order.canDownload = order.deliveryType === "digital";
            }
            await order.save();

            if (order.type === "tokens") {
                const user = await User.findById(order.user);
                user.tokens += order.tokens;
                console.log("user details",user);
                await user.save();
            }
            
        }

        res.status(200).json({ status: "Webhook processed" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};
