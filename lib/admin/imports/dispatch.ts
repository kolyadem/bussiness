type DispatchableImportAlert = {
  id: string;
  type: string;
  severity: string;
  status: string;
  title: string;
  message: string;
  details: string;
  occurrenceCount: number;
  firstDetectedAt: Date;
  lastDetectedAt: Date;
  resolvedAt: Date | null;
  acknowledgedAt?: Date | null;
  sourceConfig: {
    id: string;
    key: string;
    name: string;
  };
  job?: {
    id: string;
    status: string;
    triggerType: string;
  } | null;
};

type ImportAlertEventType = "created" | "updated" | "resolved" | "acknowledged";

export function buildImportAlertEvent(input: {
  type: ImportAlertEventType;
  alert: DispatchableImportAlert;
}) {
  return {
    event: `import.alert.${input.type}`,
    occurredAt: new Date().toISOString(),
    alert: {
      id: input.alert.id,
      type: input.alert.type,
      severity: input.alert.severity,
      status: input.alert.status,
      title: input.alert.title,
      message: input.alert.message,
      details: input.alert.details,
      occurrenceCount: input.alert.occurrenceCount,
      firstDetectedAt: input.alert.firstDetectedAt.toISOString(),
      lastDetectedAt: input.alert.lastDetectedAt.toISOString(),
      resolvedAt: input.alert.resolvedAt ? input.alert.resolvedAt.toISOString() : null,
      acknowledgedAt: input.alert.acknowledgedAt ? input.alert.acknowledgedAt.toISOString() : null,
    },
    source: {
      id: input.alert.sourceConfig.id,
      key: input.alert.sourceConfig.key,
      name: input.alert.sourceConfig.name,
    },
    job: input.alert.job
      ? {
          id: input.alert.job.id,
          status: input.alert.job.status,
          triggerType: input.alert.job.triggerType,
        }
      : null,
  };
}

export async function dispatchImportAlertEvent(input: {
  type: ImportAlertEventType;
  alert: DispatchableImportAlert;
}) {
  const webhookUrl = process.env.IMPORT_ALERT_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    return { ok: false as const, reason: "disabled" as const };
  }

  const secret = process.env.IMPORT_ALERT_WEBHOOK_SECRET?.trim();
  const payload = buildImportAlertEvent(input);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-import-alert-secret": secret } : {}),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    return {
      ok: response.ok,
      status: response.status,
    };
  } catch {
    return { ok: false as const, reason: "network_error" as const };
  }
}
