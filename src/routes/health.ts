import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({
    data: {
      status: "ok",
      service: "foodcity-back",
      timestamp: new Date().toISOString(),
    },
  });
});
