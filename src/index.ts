import "dotenv/config";
import http from "http";
import cors from "cors";
import express from "express";
import { connectMongo } from "./db.js";
import { healthRouter } from "./routes/health.js";
import { adminRouter } from "./routes/admin.js";
import { ordersPublicRouter } from "./routes/ordersPublic.js";
import { salesAdsPublicRouter } from "./routes/salesAdsPublic.js";
import { jobsPublicRouter } from "./routes/jobsPublic.js";
import { chatPublicRouter } from "./routes/chatPublic.js";
import { sitePagesPublicRouter } from "./routes/sitePagesPublic.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";
import { initSocket } from "./socket.js";

const app = express();
const port = Number(process.env.PORT) || 4000;
const corsOrigin =
  process.env.CORS_ORIGIN ??
  "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000";
const corsOrigins = corsOrigin.split(",").map((o) => o.trim());

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({ data: { name: "foodcity-back", version: "1.0.0" } });
});

app.use("/api/v1", healthRouter);
app.use("/api/v1/orders", ordersPublicRouter);
app.use("/api/v1/sales-ads", salesAdsPublicRouter);
app.use("/api/v1/jobs", jobsPublicRouter);
app.use("/api/v1/chat", chatPublicRouter);
app.use("/api/v1/site-pages", sitePagesPublicRouter);
app.use("/api/v1/admin", adminRouter);

app.use(notFoundHandler);
app.use(errorHandler);

async function main() {
  await connectMongo();
  const server = http.createServer(app);
  initSocket(server, corsOrigins);
  server.listen(port, () => {
    console.log(`foodcity-back listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
