import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";

function jwtSecret(): string {
  return process.env.ADMIN_JWT_SECRET ?? "";
}

function adminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "";
}

function adminUsername(): string {
  return process.env.ADMIN_USERNAME ?? "";
}

export const adminLoginHandler: RequestHandler = (req, res) => {
  const secret = jwtSecret();
  const pwd = adminPassword();
  const user = adminUsername();
  if (!secret || !pwd || !user) {
    res.status(503).json({
      error: {
        code: "MISCONFIGURED",
        message:
          "ADMIN_USERNAME, ADMIN_PASSWORD and ADMIN_JWT_SECRET must be set on the API server",
      },
    });
    return;
  }
  const { username, password } = req.body as { username?: string; password?: string };
  if (typeof username !== "string" || typeof password !== "string") {
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Invalid credentials" },
    });
    return;
  }
  if (username !== user || password !== pwd) {
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Invalid credentials" },
    });
    return;
  }
  const token = jwt.sign({ role: "admin" }, secret, { expiresIn: "7d" });
  res.json({ data: { token } });
};

export const requireAdminAuth: RequestHandler = (req, res, next) => {
  const secret = jwtSecret();
  if (!secret) {
    res.status(503).json({
      error: { code: "MISCONFIGURED", message: "ADMIN_JWT_SECRET must be set on the API server" },
    });
    return;
  }
  const raw = req.headers.authorization;
  const m = raw?.match(/^Bearer\s+(.+)$/i);
  if (!m?.[1]) {
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Missing or invalid Authorization" },
    });
    return;
  }
  try {
    jwt.verify(m[1], secret);
    next();
  } catch {
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Invalid or expired token" },
    });
  }
};
