type RateLimitRecord = {
  count: number;
  resetAt: number;
};

const rateLimitStore = globalThis as typeof globalThis & {
  __luminaRateLimitStore?: Map<string, RateLimitRecord>;
};

const store = rateLimitStore.__luminaRateLimitStore ?? new Map<string, RateLimitRecord>();

if (!rateLimitStore.__luminaRateLimitStore) {
  rateLimitStore.__luminaRateLimitStore = store;
}

function pruneExpired(now: number) {
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function checkRateLimit({
  namespace,
  key,
  limit,
  windowMs,
}: {
  namespace: string;
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  pruneExpired(now);

  const bucketKey = `${namespace}:${key}`;
  const current = store.get(bucketKey);

  if (!current || current.resetAt <= now) {
    const next = {
      count: 1,
      resetAt: now + windowMs,
    };
    store.set(bucketKey, next);

    return {
      allowed: true as const,
      remaining: Math.max(limit - next.count, 0),
      retryAfterMs: windowMs,
    };
  }

  if (current.count >= limit) {
    return {
      allowed: false as const,
      remaining: 0,
      retryAfterMs: Math.max(current.resetAt - now, 0),
    };
  }

  current.count += 1;
  store.set(bucketKey, current);

  return {
    allowed: true as const,
    remaining: Math.max(limit - current.count, 0),
    retryAfterMs: Math.max(current.resetAt - now, 0),
  };
}
