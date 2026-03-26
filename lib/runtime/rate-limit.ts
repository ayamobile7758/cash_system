type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitRule = {
  scope: "api-mutation" | "public-receipt";
  limit: number;
  windowMs: number;
};

type ConsumeRateLimitInput = {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
};

type ConsumeRateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __ayaRateLimitStore__: Map<string, RateLimitBucket> | undefined;
}

function getRateLimitStore() {
  // MVP/Productization hardening currently assumes a single application instance.
  // This in-memory store is sufficient for local + single-instance deployments only;
  // multi-instance deployments require a shared backend store (for example Redis).
  if (!globalThis.__ayaRateLimitStore__) {
    globalThis.__ayaRateLimitStore__ = new Map<string, RateLimitBucket>();
  }

  return globalThis.__ayaRateLimitStore__;
}

export function resetRateLimitStore() {
  getRateLimitStore().clear();
}

export function resolveRateLimitRule(pathname: string, method: string): RateLimitRule | null {
  if (process.env.CI || process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development") { return null; }
  const normalizedMethod = method.toUpperCase();

  if (pathname.startsWith("/api/") && ["POST", "PUT", "PATCH", "DELETE"].includes(normalizedMethod)) {
    return {
      scope: "api-mutation",
      limit: 30,
      windowMs: 60_000
    };
  }

  if (pathname.startsWith("/r/") && normalizedMethod === "GET") {
    return {
      scope: "public-receipt",
      limit: 60,
      windowMs: 60_000
    };
  }

  return null;
}

export function resolveClientAddress(request: { headers: Headers; ip?: string | null }) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "local";
  }

  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip") ?? request.ip ?? "local";
}

export function buildRateLimitKey(scope: RateLimitRule["scope"], clientAddress: string, pathname: string) {
  return `${scope}:${clientAddress}:${pathname}`;
}

export function consumeRateLimit(input: ConsumeRateLimitInput): ConsumeRateLimitResult {
  const store = getRateLimitStore();
  const now = input.now ?? Date.now();

  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt <= now) {
      store.delete(key);
    }
  }

  const existing = store.get(input.key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + input.windowMs;
    store.set(input.key, {
      count: 1,
      resetAt
    });

    return {
      allowed: true,
      remaining: Math.max(input.limit - 1, 0),
      resetAt
    };
  }

  if (existing.count >= input.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt
    };
  }

  existing.count += 1;
  store.set(input.key, existing);

  return {
    allowed: true,
    remaining: Math.max(input.limit - existing.count, 0),
    resetAt: existing.resetAt
  };
}
