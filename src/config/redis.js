import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const pubClient = createClient({
  url: redisUrl,
  socket: {
    connectTimeout: 10000,
    tls: redisUrl.startsWith("rediss://")
  }
});

export const subClient = pubClient.duplicate();

let redisConnected = false;

pubClient.on("error", (error) => {
  console.error("Redis pub client error:", error.message);
});

subClient.on("error", (error) => {
  console.error("Redis sub client error:", error.message);
});

export const isRedisConnected = () => redisConnected;

export const connectRedis = async () => {
  try {
    await pubClient.connect();
    await subClient.connect();
    redisConnected = true;
    console.log("Redis Connected");
  } catch (error) {
    redisConnected = false;
    console.error("Redis connection failed:", error.message);
    console.error("Server will continue without Socket.IO Redis adapter");
  }
};
