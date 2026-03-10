import { getApiErrorMeta } from "@/lib/api/common";

const CREATE_PURCHASE_ERROR_MAP = {
  ERR_IDEMPOTENCY: {
    status: 409,
    message: "تم تنفيذ أمر الشراء هذا مسبقًا."
  },
  ERR_VALIDATION_REQUIRED_FIELD: {
    status: 400,
    message: "بيانات أمر الشراء ناقصة أو غير متوافقة مع نوع الدفع."
  },
  ERR_UNAUTHORIZED: {
    status: 403,
    message: "ليس لديك صلاحية لتنفيذ أمر الشراء."
  }
} as const;

const CREATE_SUPPLIER_PAYMENT_ERROR_MAP = {
  ERR_SUPPLIER_NOT_FOUND: {
    status: 404,
    message: "المورد المطلوب غير موجود."
  },
  ERR_SUPPLIER_OVERPAY: {
    status: 400,
    message: "مبلغ التسديد يتجاوز الرصيد المستحق للمورد."
  },
  ERR_IDEMPOTENCY: {
    status: 409,
    message: "تم تنفيذ عملية تسديد المورد هذه مسبقًا."
  },
  ERR_VALIDATION_NEGATIVE_AMOUNT: {
    status: 400,
    message: "المبلغ يجب أن يكون أكبر من صفر."
  },
  ERR_UNAUTHORIZED: {
    status: 403,
    message: "ليس لديك صلاحية لتنفيذ تسديد المورد."
  }
} as const;

type CreatePurchaseErrorCode = keyof typeof CREATE_PURCHASE_ERROR_MAP;
type CreateSupplierPaymentErrorCode = keyof typeof CREATE_SUPPLIER_PAYMENT_ERROR_MAP;

export function getCreatePurchaseErrorMeta(code: string) {
  if (code in CREATE_PURCHASE_ERROR_MAP) {
    return CREATE_PURCHASE_ERROR_MAP[code as CreatePurchaseErrorCode];
  }

  return getApiErrorMeta(code);
}

export function getCreateSupplierPaymentErrorMeta(code: string) {
  if (code in CREATE_SUPPLIER_PAYMENT_ERROR_MAP) {
    return CREATE_SUPPLIER_PAYMENT_ERROR_MAP[code as CreateSupplierPaymentErrorCode];
  }

  return getApiErrorMeta(code);
}
