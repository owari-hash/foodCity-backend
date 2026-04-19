import type { RequestHandler } from "express";
import {
  adminHasAnyPermission,
  adminHasPermission,
  type AdminPermission,
} from "../constants/adminPermissions.js";

/** Single permission (or `upload` = any of sales/jobs/site-content). */
export function requirePermission(perm: AdminPermission | "upload"): RequestHandler {
  return (req, res, next) => {
    const a = req.admin;
    if (!a) {
      res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Not authenticated" },
      });
      return;
    }
    if (adminHasPermission(a.permissions, perm)) {
      next();
      return;
    }
    res.status(403).json({
      error: { code: "FORBIDDEN", message: "Permission denied" },
    });
  };
}

export function requireAnyPermission(
  ...perms: AdminPermission[]
): RequestHandler {
  return (req, res, next) => {
    const a = req.admin;
    if (!a) {
      res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Not authenticated" },
      });
      return;
    }
    if (adminHasAnyPermission(a.permissions, perms)) {
      next();
      return;
    }
    res.status(403).json({
      error: { code: "FORBIDDEN", message: "Permission denied" },
    });
  };
}
