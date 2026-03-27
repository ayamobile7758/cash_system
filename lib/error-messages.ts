import type { ApiErrorPayload } from "@/lib/pos/types";

const DEFAULT_SAFE_ERROR_MESSAGE = "تعذر إتمام العملية. حاول مجددًا.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function getSafeArabicErrorMessage(error: unknown, fallback = DEFAULT_SAFE_ERROR_MESSAGE) {
  if (!isRecord(error)) {
    return fallback;
  }

  const payload = error as Partial<ApiErrorPayload> & { code?: unknown; message?: unknown };

  if (typeof payload.code === "string" && payload.code.startsWith("ERR_") && hasText(payload.message)) {
    return payload.message;
  }

  return fallback;
}
