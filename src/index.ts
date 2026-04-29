import "dotenv/config";
import http from "http";
import cors from "cors";
import express from "express";
import { connectMongo } from "./db.js";
import { UPLOAD_DIR } from "./uploadConfig.js";
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
/** Allowed browser origins (REST + Socket.io). Override with CORS_ORIGIN in .env */
const PRODUCTION_ORIGINS = [
  "https://bukhbatllc.mn",
  "https://www.bukhbatllc.mn",
  "http://bukhbatllc.mn",
  "http://www.bukhbatllc.mn",
];
const envOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const corsOrigins = [...new Set([...envOrigins, ...PRODUCTION_ORIGINS])];

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
);
app.use(express.json({ limit: "250mb" }));
app.use(express.urlencoded({ extended: true, limit: "250mb" }));

/** Public URLs: GET /upload/... — same paths stored in CMS (e.g. /upload/abc.jpg) */
app.use("/upload", express.static(UPLOAD_DIR));

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

/**
 * Some reverse proxies forward the browser path `/api/v1/...` to the Node app as `/v1/...`
 * (strip `/api`). Duplicate mounts keep the same handlers reachable in both cases.
 */
app.use("/v1", healthRouter);
app.use("/v1/orders", ordersPublicRouter);
app.use("/v1/sales-ads", salesAdsPublicRouter);
app.use("/v1/jobs", jobsPublicRouter);
app.use("/v1/chat", chatPublicRouter);
app.use("/v1/site-pages", sitePagesPublicRouter);
app.use("/v1/admin", adminRouter);

/**
 * When the proxy strips the full `/api/v1/` prefix (`location /api/v1/ { proxy_pass …/; }`),
 * the browser path `/api/v1/admin/site-pages/…` arrives as `/admin/site-pages/…`.
 */
app.use("/orders", ordersPublicRouter);
app.use("/sales-ads", salesAdsPublicRouter);
app.use("/jobs", jobsPublicRouter);
app.use("/chat", chatPublicRouter);
app.use("/site-pages", sitePagesPublicRouter);
app.use("/admin", adminRouter);
app.use("/", healthRouter);

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
