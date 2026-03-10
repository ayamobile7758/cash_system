import { getApiErrorMeta } from "@/lib/api/common";

const CREATE_MAINTENANCE_ERROR_MAP = {
  ERR_IDEMPOTENCY: {
    status: 409,
    message: "تم إنشاء أمر الصيانة نفسه مسبقًا."
  },
  ERR_VALIDATION_REQUIRED_FIELD: {
    status: 400,
    message: "بيانات أمر الصيانة ناقصة."
  },
  ERR_VALIDATION_NEGATIVE_AMOUNT: {
    status: 400,
    message: "التكلفة التقديرية أو النهائية يجب أن تكون صفرًا أو أكبر."
  },
  ERR_API_VALIDATION_FAILED: {
    status: 400,
    message: "بيانات أمر الصيانة غير صالحة."
  },
  ERR_UNAUTHORIZED: {
    status: 403,
    message: "ليس لديك صلاحية لإنشاء أمر الصيانة."
  }
} as const;

const UPDATE_MAINTENANCE_ERROR_MAP = {
  ERR_MAINTENANCE_INVALID_STATUS: {
    status: 400,
    message: "لا يمكن تحويل حالة أمر الصيانة إلى هذه المرحلة."
  },
  ERR_VALIDATION_REQUIRED_FIELD: {
    status: 400,
    message: "بيانات تحديث حالة الصيانة ناقصة."
  },
  ERR_VALIDATION_NEGATIVE_AMOUNT: {
    status: 400,
    message: "المبلغ النهائي يجب أن يكون صفرًا أو أكبر."
  },
  ERR_ACCOUNT_NOT_FOUND: {
    status: 404,
    message: "حساب الصيانة المطلوب غير موجود أو غير صالح للتسليم."
  },
  ERR_ITEM_NOT_FOUND: {
    status: 404,
    message: "أمر الصيانة المطلوب غير موجود."
  },
  ERR_UNAUTHORIZED: {
    status: 403,
    message: "ليس لديك صلاحية لتنفيذ هذا التحديث على أمر الصيانة."
  },
  ERR_API_VALIDATION_FAILED: {
    status: 400,
    message: "بيانات تحديث حالة الصيانة غير صالحة."
  }
} as const;

type CreateMaintenanceErrorCode = keyof typeof CREATE_MAINTENANCE_ERROR_MAP;
type UpdateMaintenanceErrorCode = keyof typeof UPDATE_MAINTENANCE_ERROR_MAP;

export function getCreateMaintenanceErrorMeta(code: string) {
  if (code in CREATE_MAINTENANCE_ERROR_MAP) {
    return CREATE_MAINTENANCE_ERROR_MAP[code as CreateMaintenanceErrorCode];
  }

  return getApiErrorMeta(code);
}

export function getUpdateMaintenanceErrorMeta(code: string) {
  if (code in UPDATE_MAINTENANCE_ERROR_MAP) {
    return UPDATE_MAINTENANCE_ERROR_MAP[code as UpdateMaintenanceErrorCode];
  }

  return getApiErrorMeta(code);
}
