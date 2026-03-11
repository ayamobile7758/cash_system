import { getApiErrorMeta } from "@/lib/api/common";

const PERMISSIONS_ERROR_MAP = {
  ERR_PERMISSION_BUNDLE_NOT_FOUND: {
    status: 404,
    message: "حزمة الصلاحيات المطلوبة غير موجودة أو غير مفعلة."
  },
  ERR_ROLE_ASSIGNMENT_INVALID: {
    status: 400,
    message: "تعذر تنفيذ تعيين الصلاحيات للمستخدم المحدد."
  },
  ERR_DISCOUNT_APPROVAL_REQUIRED: {
    status: 403,
    message: "هذا الخصم يحتاج اعتمادًا من حزمة صلاحيات أعلى."
  }
} as const;

type PermissionsErrorCode = keyof typeof PERMISSIONS_ERROR_MAP;

export function getPermissionsErrorMeta(code: string) {
  if (code in PERMISSIONS_ERROR_MAP) {
    return PERMISSIONS_ERROR_MAP[code as PermissionsErrorCode];
  }

  return getApiErrorMeta(code);
}
