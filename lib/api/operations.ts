import { getApiErrorMeta } from "@/lib/api/common";

const CREATE_TOPUP_ERROR_MAP = {
  ERR_IDEMPOTENCY: {
    status: 409,
    message: "تم تنفيذ عملية الشحن هذه مسبقًا."
  },
  ERR_VALIDATION_NEGATIVE_AMOUNT: {
    status: 400,
    message: "المبلغ والربح يجب أن يكونا صفرًا أو أكبر."
  },
  ERR_API_VALIDATION_FAILED: {
    status: 400,
    message: "بيانات الشحن غير صالحة."
  },
  ERR_UNAUTHORIZED: {
    status: 403,
    message: "ليس لديك صلاحية لتنفيذ عملية الشحن."
  }
} as const;

const CREATE_TRANSFER_ERROR_MAP = {
  ERR_TRANSFER_SAME_ACCOUNT: {
    status: 400,
    message: "لا يمكن التحويل إلى نفس الحساب."
  },
  ERR_INSUFFICIENT_BALANCE: {
    status: 400,
    message: "رصيد الحساب المصدر لا يكفي لإتمام التحويل."
  },
  ERR_IDEMPOTENCY: {
    status: 409,
    message: "تم تنفيذ عملية التحويل هذه مسبقًا."
  },
  ERR_VALIDATION_NEGATIVE_AMOUNT: {
    status: 400,
    message: "المبلغ يجب أن يكون أكبر من صفر."
  },
  ERR_API_VALIDATION_FAILED: {
    status: 400,
    message: "بيانات التحويل غير صالحة."
  },
  ERR_UNAUTHORIZED: {
    status: 403,
    message: "ليس لديك صلاحية لتنفيذ عملية التحويل."
  }
} as const;

type CreateTopupErrorCode = keyof typeof CREATE_TOPUP_ERROR_MAP;
type CreateTransferErrorCode = keyof typeof CREATE_TRANSFER_ERROR_MAP;

export function getCreateTopupErrorMeta(code: string) {
  if (code in CREATE_TOPUP_ERROR_MAP) {
    return CREATE_TOPUP_ERROR_MAP[code as CreateTopupErrorCode];
  }

  return getApiErrorMeta(code);
}

export function getCreateTransferErrorMeta(code: string) {
  if (code in CREATE_TRANSFER_ERROR_MAP) {
    return CREATE_TRANSFER_ERROR_MAP[code as CreateTransferErrorCode];
  }

  return getApiErrorMeta(code);
}
