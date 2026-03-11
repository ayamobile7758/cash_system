import { getApiErrorMeta } from "@/lib/api/common";

const CANCEL_INVOICE_ERROR_MAP = {
  ERR_CANCEL_ALREADY: { status: 409, message: "هذه الفاتورة ملغاة أو مغلقة مسبقًا." },
  ERR_CANCEL_HAS_RETURN: { status: 400, message: "لا يمكن إلغاء فاتورة مرتبطة بمرتجع." },
  ERR_CANCEL_REASON: { status: 400, message: "سبب الإلغاء غير صالح أو أقصر من الحد المطلوب." },
  ERR_CANNOT_CANCEL_PAID_DEBT: {
    status: 400,
    message: "لا يمكن إلغاء فاتورة دين سُدد جزء من دينها."
  },
  ERR_INVOICE_NOT_FOUND: { status: 404, message: "الفاتورة غير موجودة." },
  ERR_UNAUTHORIZED: { status: 403, message: "ليس لديك صلاحية لهذه العملية." }
} as const;

const EDIT_INVOICE_ERROR_MAP = {
  ERR_CANCEL_ALREADY: { status: 409, message: "هذه الفاتورة غير قابلة للتعديل." },
  ERR_CANCEL_HAS_RETURN: { status: 400, message: "لا يمكن تعديل فاتورة مرتبطة بمرتجع." },
  ERR_CANCEL_REASON: { status: 400, message: "سبب التعديل غير صالح أو أقصر من الحد المطلوب." },
  ERR_INVOICE_NOT_FOUND: { status: 404, message: "الفاتورة غير موجودة." },
  ERR_IDEMPOTENCY: { status: 409, message: "تم تنفيذ هذه العملية مسبقًا." },
  ERR_PRODUCT_NOT_FOUND: { status: 404, message: "أحد المنتجات المطلوبة غير موجود." },
  ERR_CUSTOMER_NOT_FOUND: { status: 404, message: "عميل الدين المطلوب غير موجود." },
  ERR_STOCK_INSUFFICIENT: { status: 400, message: "المخزون غير كافٍ لإتمام التعديل." },
  ERR_PAYMENT_MISMATCH: { status: 400, message: "مجموع المدفوعات لا يساوي إجمالي الفاتورة." },
  ERR_DISCOUNT_APPROVAL_REQUIRED: {
    status: 403,
    message: "هذا الخصم يحتاج اعتمادًا من حزمة صلاحيات أعلى."
  },
  ERR_UNAUTHORIZED: { status: 403, message: "ليس لديك صلاحية لهذه العملية." }
} as const;

type CancelInvoiceErrorCode = keyof typeof CANCEL_INVOICE_ERROR_MAP;
type EditInvoiceErrorCode = keyof typeof EDIT_INVOICE_ERROR_MAP;

export function getCancelInvoiceErrorMeta(code: string) {
  if (code in CANCEL_INVOICE_ERROR_MAP) {
    return CANCEL_INVOICE_ERROR_MAP[code as CancelInvoiceErrorCode];
  }

  return getApiErrorMeta(code);
}

export function getEditInvoiceErrorMeta(code: string) {
  if (code in EDIT_INVOICE_ERROR_MAP) {
    return EDIT_INVOICE_ERROR_MAP[code as EditInvoiceErrorCode];
  }

  return getApiErrorMeta(code);
}
