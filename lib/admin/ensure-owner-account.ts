import { hash } from "bcryptjs";
import { db } from "@/lib/db";

export type EnsureOwnerResult =
  | { status: "skipped"; reason: "missing_password" }
  | { status: "ok"; action: "created" | "updated"; login: string; email: string };

function readOwnerEnv() {
  const login =
    process.env.MAIN_ADMIN_USERNAME?.trim() ||
    process.env.MAIN_ADMIN_LOGIN?.trim() ||
    "kolyadem1";
  const email = process.env.MAIN_ADMIN_EMAIL?.trim() || "kolyadem2@gmail.com";
  const password = process.env.MAIN_ADMIN_PASSWORD?.trim();
  const name = process.env.MAIN_ADMIN_NAME?.trim() || "Admin";
  return { login, email, password, name };
}

/**
 * Creates or updates the owner admin by `MAIN_ADMIN_*` env.
 * Lookup: one user matching `email` OR `login` (same row if both match).
 * - No duplicate users: at most one upsert per call.
 * - If user exists: updates password hash, role ADMIN, login/email/name from env (keeps same id).
 * - If `MAIN_ADMIN_PASSWORD` is empty and `requirePassword` is false: skips (e.g. Vercel without secrets).
 */
export async function ensureOwnerAccount(options: {
  /** When true, missing MAIN_ADMIN_PASSWORD throws (CLI `admin:ensure`). */
  requirePassword?: boolean;
}): Promise<EnsureOwnerResult> {
  const { login, email, password, name } = readOwnerEnv();

  if (!password) {
    if (options.requirePassword) {
      throw new Error("MAIN_ADMIN_PASSWORD is required (set in .env before running npm run admin:ensure).");
    }
    return { status: "skipped", reason: "missing_password" };
  }

  const passwordHash = await hash(password, 12);

  const existing = await db.user.findFirst({
    where: {
      OR: [{ email }, { login }],
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    await db.user.update({
      where: { id: existing.id },
      data: {
        login,
        email,
        name,
        passwordHash,
        role: "ADMIN",
        locale: "uk",
      },
    });
    return { status: "ok", action: "updated", login, email };
  }

  await db.user.create({
    data: {
      login,
      email,
      name,
      passwordHash,
      role: "ADMIN",
      locale: "uk",
    },
  });

  return { status: "ok", action: "created", login, email };
}
