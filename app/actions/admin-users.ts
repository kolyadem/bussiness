"use server";

import { redirect } from "next/navigation";
import { USER_ROLES } from "@/lib/auth";
import { countAdminUsers, requireAdminOnlyAccess } from "@/lib/admin";
import { db } from "@/lib/db";

function normalizeRole(value: string | null | undefined) {
  if (value === USER_ROLES.manager) {
    return USER_ROLES.manager;
  }

  return USER_ROLES.customer;
}

export async function updateUserRoleAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "uk");
  const targetUserId = String(formData.get("userId") ?? "").trim();
  const nextRole = normalizeRole(String(formData.get("role") ?? ""));
  const admin = await requireAdminOnlyAccess(locale);

  if (!targetUserId) {
    redirect(`/admin/users?error=missing-user`);
  }

  const target = await db.user.findUnique({
    where: {
      id: targetUserId,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!target) {
    redirect(`/admin/users?error=user-not-found`);
  }

  if (target.id === admin.id) {
    redirect(`/admin/users?error=self-role-lock`);
  }

  if (target.role === USER_ROLES.admin) {
    const adminCount = await countAdminUsers();

    if (adminCount <= 1) {
      redirect(`/admin/users?error=last-admin-lock`);
    }
  }

  await db.user.update({
    where: {
      id: target.id,
    },
    data: {
      role: nextRole,
    },
  });

  redirect(`/admin/users?saved=1`);
}
