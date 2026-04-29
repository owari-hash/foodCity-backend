import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectMongo } from "../db.js";
import { ALL_ADMIN_PERMISSIONS } from "../constants/adminPermissions.js";
import { AdminUser } from "../models/AdminUser.js";

async function main() {
  await connectMongo();
  const existing = await AdminUser.countDocuments();
  if (existing > 0) {
    console.log("AdminUser documents already exist; nothing to seed.");
    return;
  }

  const usernameRaw =
    process.env.ADMIN_SEED_USERNAME?.trim() || process.env.ADMIN_USERNAME?.trim();
  const password =
    process.env.ADMIN_SEED_PASSWORD ?? process.env.ADMIN_PASSWORD ?? "";
  if (!usernameRaw || !password) {
    console.error(
      "Set ADMIN_SEED_USERNAME and ADMIN_SEED_PASSWORD (or legacy ADMIN_USERNAME / ADMIN_PASSWORD).",
    );
    process.exit(1);
  }

  const username = usernameRaw.toLowerCase();
  const displayName =
    process.env.ADMIN_SEED_DISPLAY_NAME?.trim() || usernameRaw || "Administrator";
  const passwordHash = await bcrypt.hash(password, 10);

  await AdminUser.create({
    username,
    passwordHash,
    displayName,
    permissions: [...ALL_ADMIN_PERMISSIONS],
    active: true,
  });

  console.log(`Seeded AdminUser: ${username} (all permissions).`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
