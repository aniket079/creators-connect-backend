import express from "express";
import "dotenv/config";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import assetRoutes from "./routes/assestRoute.js";
import chatRoutes from "./routes/chatRoutes.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import http from "http";
import initializeSocket from "./socket/socket.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import planRoutes from "./routes/planRoutes.js"
import webhookRoutes from "./routes/webhookRoute.js"
import userRoutes from "./routes/userRoutes.js";
import artistRoutes from "./routes/artistRoutes.js";
import purchaseRoutes from "./routes/purchaseRoutes.js";
import { connectRedis } from "./config/redis.js";

connectDB();
await connectRedis();

const app = express();
const server = http.createServer(app);

app.use("/api/webhook", webhookRoutes);
app.use(express.json());
app.use(cookieParser());

app.use(cors({
   origin: true,
  credentials: true
}));

app.use("/api/auth", authRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/artists", artistRoutes);
app.use("/api/purchases", purchaseRoutes);
initializeSocket(server);

server.listen(process.env.PORT, () => {
  console.log("Server running on port", process.env.PORT);
});
