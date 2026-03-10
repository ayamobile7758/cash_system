import { getApiErrorMeta } from "@/lib/api/common";

const INVENTORY_CREATE_ERROR_MAP = {
  ERR_PRODUCT_NOT_FOUND: {
    status: 404,
    message: "لم يتم العثور على المنتجات المطلوبة لبدء الجرد."
  },
  ERR_UNAUTHORIZED: {
    status: 403,
    message: "ليس لديك صلاحية لبدء الجرد."
  }
} as const;

const INVENTORY_ERROR_MAP = {
  ERR_COUNT_NOT_FOUND: {
    status: 404,
    message: "عملية الجرد المطلوبة غير موجودة."
  },
  ERR_COUNT_ALREADY_COMPLETED: {
    status: 409,
    message: "هذه العملية أُغلقت مسبقًا ولا يمكن إكمالها مرة ثانية."
  },
  ERR_VALIDATION_NEGATIVE_QUANTITY: {
    status: 400,
    message: "الكمية الفعلية يجب أن تكون صفرًا أو أكبر."
  },
  ERR_UNAUTHORIZED: {
    status: 403,
    message: "ليس لديك صلاحية لإكمال الجرد."
  }
} as const;

type InventoryCreateErrorCode = keyof typeof INVENTORY_CREATE_ERROR_MAP;
type InventoryErrorCode = keyof typeof INVENTORY_ERROR_MAP;

export function getCreateInventoryCountErrorMeta(code: string) {
  if (code in INVENTORY_CREATE_ERROR_MAP) {
    return INVENTORY_CREATE_ERROR_MAP[code as InventoryCreateErrorCode];
  }

  return getApiErrorMeta(code);
}

export function getCompleteInventoryErrorMeta(code: string) {
  if (code in INVENTORY_ERROR_MAP) {
    return INVENTORY_ERROR_MAP[code as InventoryErrorCode];
  }

  return getApiErrorMeta(code);
}
