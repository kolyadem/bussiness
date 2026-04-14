/** Optional Telegram username for orders / build requests. Returns normalized @handle or null. */
export function normalizeTelegramUsernameInput(raw: string | undefined | null): string | null {
  const trimmed = raw?.trim();

  if (!trimmed) {
    return null;
  }

  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;

  if (!/^[a-zA-Z0-9_]{5,32}$/.test(withoutAt)) {
    return null;
  }

  return `@${withoutAt.toLowerCase()}`;
}
