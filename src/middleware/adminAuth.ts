import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { AdminUser } from "../models/AdminUser.js";
import { ALL_ADMIN_PERMISSIONS } from "../constants/adminPermissions.js";
import type { AdminPrincipal } from "../types/adminPrincipal.js";

export type { AdminPrincipal };

function jwtSecret(): string {
  return process.env.ADMIN_JWT_SECRET ?? "";
}

function adminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "";
}

function adminUsername(): string {
  return process.env.ADMIN_USERNAME ?? "";
}

function signToken(principal: AdminPrincipal): string {
  const secret = jwtSecret();
  return jwt.sign(
    {
      sub: principal.sub,
      username: principal.username,
      displayName: principal.displayName,
      permissions: principal.permissions,
    },
    secret,
    { expiresIn: "7d" },
  );
}

function principalFromPayload(payload: jwt.JwtPayload): AdminPrincipal {
  const p = payload as Record<string, unknown>;
  if (Array.isArray(p.permissions) && p.permissions.length > 0) {
    return {
      sub: String(p.sub ?? ""),
      username: String(p.username ?? ""),
      displayName: String(p.displayName ?? p.username ?? "Admin"),
      permissions: p.permissions as string[],
    };
  }
  if (p.role === "admin") {
    return {
      sub: "legacy",
      username: "admin",
      displayName: "Administrator",
      permissions: [...ALL_ADMIN_PERMISSIONS],
    };
  }
  throw new Error("INVALID_TOKEN");
}

export const adminLoginHandler: RequestHandler = async (req, res) => {
  const secret = jwtSecret();
  const { username, password } = req.body as { username?: string; password?: string };
  if (!secret) {
    res.status(503).json({
      error: {
        code: "MISCONFIGURED",
        message: "ADMIN_JWT_SECRET must be set on the API server",
      },
    });
    return;
  }
  if (typeof username !== "string" || typeof password !== "string") {
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Invalid credentials" },
    });
    return;
  }

  const u = username.trim().toLowerCase();
  const pwd = password;

  try {
    const user = await AdminUser.findOne({ username: u, active: true }).lean();
    if (user && typeof user.passwordHash === "string") {
      const ok = await bcrypt.compare(pwd, user.passwordHash);
      if (ok) {
        const principal: AdminPrincipal = {
          sub: String(user._id),
          username: user.username,
          displayName: user.displayName,
          permissions: Array.isArray(user.permissions) ? user.permissions : [],
        };
        const token = signToken(principal);
        res.json({
          data: {
            token,
            username: principal.username,
            displayName: principal.displayName,
            permissions: principal.permissions,
          },
        });
        return;
      }
    }
  } catch {
    /* fall through to legacy */
  }

  const legacyUser = adminUsername().trim().toLowerCase();
  const legacyPwd = adminPassword();
  if (legacyUser && legacyPwd && u === legacyUser && pwd === legacyPwd) {
    const principal: AdminPrincipal = {
      sub: "env",
      username: legacyUser,
      displayName: "Administrator",
      permissions: [...ALL_ADMIN_PERMISSIONS],
    };
    const token = signToken(principal);
    res.json({
      data: {
        token,
        username: principal.username,
        displayName: principal.displayName,
        permissions: principal.permissions,
      },
    });
    return;
  }

  res.status(401).json({
    error: { code: "UNAUTHORIZED", message: "Invalid credentials" },
  });
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
    const payload = jwt.verify(m[1], secret) as jwt.JwtPayload;
    req.admin = principalFromPayload(payload);
    next();
  } catch {
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Invalid or expired token" },
    });
  }
};
