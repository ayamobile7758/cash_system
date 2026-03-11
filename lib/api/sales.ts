const CREATE_SALE_ERROR_MAP = {
  ERR_PRODUCT_NOT_FOUND: { status: 404, message: "المنتج المطلوب غير موجود." },
  ERR_STOCK_INSUFFICIENT: { status: 400, message: "المخزون غير كاف لهذا المنتج." },
  ERR_DISCOUNT_EXCEEDED: { status: 400, message: "نسبة الخصم تتجاوز الحد المسموح." },
  ERR_DISCOUNT_APPROVAL_REQUIRED: {
    status: 403,
    message: "هذا الخصم يحتاج اعتمادًا من حزمة صلاحيات أعلى."
  },
  ERR_PAYMENT_MISMATCH: { status: 400, message: "مجموع المدفوعات لا يساوي إجمالي الفاتورة." },
  ERR_IDEMPOTENCY: { status: 409, message: "تم تنفيذ هذه العملية مسبقًا." },
  ERR_CONCURRENT_STOCK_UPDATE: {
    status: 409,
    message: "تغير المخزون أثناء تنفيذ العملية. راجع الكمية وأعد المحاولة بمفتاح جديد."
  },
  ERR_API_SESSION_INVALID: {
    status: 401,
    message: "الجلسة غير صالحة. يرجى تسجيل الدخول مجددًا."
  },
  ERR_API_ROLE_FORBIDDEN: {
    status: 403,
    message: "ليس لديك صلاحية لهذه العملية."
  },
  ERR_API_VALIDATION_FAILED: {
    status: 400,
    message: "بيانات الطلب غير صالحة."
  },
  ERR_API_INTERNAL: {
    status: 500,
    message: "حدث خطأ غير متوقع. حاول مجددًا."
  }
} as const;

export type CreateSaleErrorCode = keyof typeof CREATE_SALE_ERROR_MAP;

export function extractErrorCode(message: string) {
  const match = message.match(/ERR_[A-Z_]+/);
  return match?.[0] ?? "ERR_API_INTERNAL";
}

export function isKnownCreateSaleError(code: string): code is CreateSaleErrorCode {
  return code in CREATE_SALE_ERROR_MAP;
}

export function getCreateSaleErrorMeta(code: string) {
  if (isKnownCreateSaleError(code)) {
    return CREATE_SALE_ERROR_MAP[code];
  }

  return CREATE_SALE_ERROR_MAP.ERR_API_INTERNAL;
}
