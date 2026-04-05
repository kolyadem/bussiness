import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthenticatedUser, hasRole, USER_ROLES } from "@/lib/auth";
import { executeImportSourceConfig } from "@/lib/admin/imports/scheduler";
import { isImportMode, isImportSourceType } from "@/lib/admin/imports/types";

const rerunSchema = z.object({
  dryRun: z.boolean().optional(),
  importMode: z.string().trim().optional(),
});

function jsonAuthError(status: 401 | 403) {
  return NextResponse.json(
    {
      error: status === 401 ? "Authentication required" : "Insufficient permissions",
    },
    { status },
  );
}

async function requireAdminApiUser() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { error: jsonAuthError(401) } as const;
  }

  if (!hasRole(user.role, USER_ROLES.admin)) {
    return { error: jsonAuthError(403) } as const;
  }

  return { user } as const;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser();

  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await context.params;
  const payload = await request.json().catch(() => null);
  const parsed = rerunSchema.safeParse(payload ?? {});

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const job = await db.importJob.findUnique({
    where: {
      id,
    },
    include: {
      sourceConfig: true,
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Import job not found" }, { status: 404 });
  }

  const sourceType = job.sourceConfig?.sourceType ?? job.sourceType;
  const importMode = parsed.data.importMode ?? job.sourceConfig?.defaultImportMode ?? job.importMode;

  if (!isImportSourceType(sourceType) || !isImportMode(importMode)) {
    return NextResponse.json({ error: "Stored import job configuration is invalid" }, { status: 400 });
  }

  if (sourceType.startsWith("UPLOAD_")) {
    return NextResponse.json(
      {
        error: "Uploaded file imports cannot be re-run automatically without a new file",
      },
      { status: 400 },
    );
  }
  const result = await executeImportSourceConfig({
    sourceConfigId: job.sourceConfig?.id ?? id,
    triggerType: "RERUN",
    startedByUserId: auth.user.id,
    dryRun: parsed.data.dryRun ?? false,
    importModeOverride: importMode,
    requireDue: false,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
