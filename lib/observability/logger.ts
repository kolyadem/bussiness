import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

type LogLevel = "info" | "warn" | "error";

const LOG_DIR = path.join(process.cwd(), "var", "log");
const APP_LOG_PATH = path.join(LOG_DIR, "app.log");

async function ensureLogDir() {
  await mkdir(LOG_DIR, { recursive: true });
}

async function writeLogLine(targetPath: string, payload: Record<string, unknown>) {
  await ensureLogDir();
  await appendFile(targetPath, `${JSON.stringify(payload)}\n`, "utf8");
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: typeof error === "string" ? error : "Unknown error",
  };
}

export async function logEvent(
  level: LogLevel,
  message: string,
  details?: Record<string, unknown>,
) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...details,
  };

  if (level === "error") {
    console.error(message, details ?? {});
  } else if (level === "warn") {
    console.warn(message, details ?? {});
  } else {
    console.info(message, details ?? {});
  }

  try {
    await writeLogLine(APP_LOG_PATH, payload);
  } catch {
    // Avoid crashing the request path on logging failures.
  }
}

export async function reportServerError(
  error: unknown,
  context: {
    area: string;
    message?: string;
    details?: Record<string, unknown>;
  },
) {
  return logEvent("error", context.message ?? "Unhandled server error", {
    area: context.area,
    error: serializeError(error),
    ...context.details,
  });
}
