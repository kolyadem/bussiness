const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

function addMilliseconds(date: Date, milliseconds: number) {
  return new Date(date.getTime() + milliseconds);
}

export function resolveNextImportSyncAt(input: {
  frequency?: string | null;
  from: Date;
}) {
  const frequency = String(input.frequency ?? "")
    .trim()
    .toLowerCase();

  if (!frequency || frequency === "manual" || frequency === "paused" || frequency === "none") {
    return null;
  }

  if (frequency === "hourly") {
    return addMilliseconds(input.from, HOUR_MS);
  }

  if (frequency === "daily") {
    return addMilliseconds(input.from, DAY_MS);
  }

  if (frequency === "weekly") {
    return addMilliseconds(input.from, WEEK_MS);
  }

  const compactMatch = frequency.match(/^(\d+)(h|d|w)$/);

  if (compactMatch) {
    const interval = Number(compactMatch[1]);
    const unit = compactMatch[2];

    if (interval > 0) {
      return addMilliseconds(
        input.from,
        unit === "h" ? interval * HOUR_MS : unit === "d" ? interval * DAY_MS : interval * WEEK_MS,
      );
    }
  }

  const verboseMatch = frequency.match(/^every:(\d+):(hours|days|weeks)$/);

  if (verboseMatch) {
    const interval = Number(verboseMatch[1]);
    const unit = verboseMatch[2];

    if (interval > 0) {
      return addMilliseconds(
        input.from,
        unit === "hours"
          ? interval * HOUR_MS
          : unit === "days"
            ? interval * DAY_MS
            : interval * WEEK_MS,
      );
    }
  }

  return null;
}

export function resolveFailedImportRetryAt(input: {
  now: Date;
  consecutiveFailures: number;
}) {
  const attempts = Math.max(1, input.consecutiveFailures);
  const backoffHours = Math.min(24, 2 ** Math.min(attempts - 1, 4));
  return addMilliseconds(input.now, backoffHours * HOUR_MS);
}
