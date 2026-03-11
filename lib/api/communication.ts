import { getApiErrorMeta } from "@/lib/api/common";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const RECEIPT_LINK_ERROR_MAP = {
  ERR_RECEIPT_LINK_INVALID: {
    status: 404,
    message: "رابط الإيصال المطلوب غير صالح أو غير موجود."
  },
  ERR_RECEIPT_LINK_REVOKED: {
    status: 410,
    message: "تم إلغاء رابط الإيصال من النظام."
  },
  ERR_RECEIPT_LINK_EXPIRED: {
    status: 410,
    message: "انتهت صلاحية رابط الإيصال."
  },
  ERR_UNAUTHORIZED: {
    status: 403,
    message: "ليس لديك صلاحية لإدارة روابط الإيصالات."
  },
  ERR_INVOICE_NOT_FOUND: {
    status: 404,
    message: "الفاتورة المطلوبة غير موجودة."
  },
  ERR_API_VALIDATION_FAILED: {
    status: 400,
    message: "بيانات رابط الإيصال غير صالحة."
  }
} as const;

const WHATSAPP_ERROR_MAP = {
  ERR_WHATSAPP_DELIVERY_FAILED: {
    status: 502,
    message: "تعذر تجهيز رسالة واتساب في هذه المحاولة."
  },
  ERR_IDEMPOTENCY: {
    status: 409,
    message: "تم تسجيل هذه المحاولة مسبقًا."
  },
  ERR_UNAUTHORIZED: {
    status: 403,
    message: "ليس لديك صلاحية لإرسال رسائل واتساب."
  },
  ERR_API_VALIDATION_FAILED: {
    status: 400,
    message: "بيانات رسالة واتساب غير صالحة."
  }
} as const;

const DEBT_REMINDER_ERROR_MAP = {
  ERR_API_VALIDATION_FAILED: {
    status: 400,
    message: "بيانات تشغيل مجدول التذكير غير صالحة."
  },
  ERR_UNAUTHORIZED: {
    status: 403,
    message: "ليس لديك صلاحية لتشغيل مجدول التذكير."
  }
} as const;

type ReceiptLinkErrorCode = keyof typeof RECEIPT_LINK_ERROR_MAP;
type WhatsAppErrorCode = keyof typeof WHATSAPP_ERROR_MAP;
type DebtReminderErrorCode = keyof typeof DEBT_REMINDER_ERROR_MAP;
type SupabaseAdminClient = ReturnType<typeof getSupabaseAdminClient>;

export type WhatsAppTemplateKey =
  | "receipt_share"
  | "debt_due_reminder"
  | "debt_overdue"
  | "maintenance_ready";

export type ReceiptLinkChannel = "share" | "whatsapp";

type ReceiptTokenRow = {
  id: string;
  invoice_id: string;
  expires_at: string;
  revoked_at: string | null;
};

type PublicInvoiceRow = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
};

type PublicInvoiceItemRow = {
  id: string;
  invoice_id: string;
  product_name_at_time: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type StoreNameRow = {
  value: string;
};

type InvoiceWhatsAppRow = {
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
};

type DebtReminderRow = {
  due_date: string;
  remaining_amount: number;
  debt_customers: {
    name: string;
  } | null;
};

type MaintenanceWhatsAppRow = {
  job_number: string;
  customer_name: string;
};

export type PublicReceiptItem = {
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type PublicReceiptView =
  | {
      state: "ok";
      data: {
        invoice_number: string;
        invoice_date: string;
        store_name: string;
        items: PublicReceiptItem[];
        total: number;
      };
    }
  | { state: "invalid" }
  | { state: "revoked" }
  | { state: "expired" };

export function getReceiptLinkErrorMeta(code: string) {
  if (code in RECEIPT_LINK_ERROR_MAP) {
    return RECEIPT_LINK_ERROR_MAP[code as ReceiptLinkErrorCode];
  }

  return getApiErrorMeta(code);
}

export function getWhatsAppErrorMeta(code: string) {
  if (code in WHATSAPP_ERROR_MAP) {
    return WHATSAPP_ERROR_MAP[code as WhatsAppErrorCode];
  }

  return getApiErrorMeta(code);
}

export function getDebtReminderErrorMeta(code: string) {
  if (code in DEBT_REMINDER_ERROR_MAP) {
    return DEBT_REMINDER_ERROR_MAP[code as DebtReminderErrorCode];
  }

  return getApiErrorMeta(code);
}

export function buildReceiptUrl(origin: string, token: string) {
  return `${origin}/r/${encodeURIComponent(token)}`;
}

export function normalizeWhatsAppPhone(phone: string) {
  let normalized = phone.replace(/[^\d]/g, "");

  if (normalized.startsWith("00")) {
    normalized = normalized.slice(2);
  } else if (normalized.startsWith("0")) {
    normalized = `962${normalized.slice(1)}`;
  } else if (!normalized.startsWith("962")) {
    normalized = `962${normalized}`;
  }

  return normalized;
}

export function buildWhatsAppDeepLink(phone: string, message: string) {
  return `https://wa.me/${normalizeWhatsAppPhone(phone)}?text=${encodeURIComponent(message)}`;
}

function getStringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

async function getStoreLabel(supabase: SupabaseAdminClient) {
  const { data, error } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "store_name")
    .maybeSingle<StoreNameRow>();

  if (error) {
    throw error;
  }

  return data?.value?.trim() || "Aya Mobile";
}

async function getStorePhone(supabase: SupabaseAdminClient) {
  const { data, error } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "store_phone")
    .maybeSingle<StoreNameRow>();

  if (error) {
    throw error;
  }

  return data?.value?.trim() || "0770000000";
}

export async function getPublicReceiptViewByToken(
  supabase: SupabaseAdminClient,
  token: string
): Promise<PublicReceiptView> {
  const { data: tokenRow, error: tokenError } = await supabase
    .from("receipt_link_tokens")
    .select("id, invoice_id, expires_at, revoked_at")
    .eq("token_value", token)
    .maybeSingle<ReceiptTokenRow>();

  if (tokenError) {
    throw tokenError;
  }

  if (!tokenRow) {
    return { state: "invalid" };
  }

  if (tokenRow.revoked_at) {
    return { state: "revoked" };
  }

  if (new Date(tokenRow.expires_at).getTime() <= Date.now()) {
    return { state: "expired" };
  }

  const [invoiceResult, itemsResult, storeName] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_number, invoice_date, total_amount")
      .eq("id", tokenRow.invoice_id)
      .maybeSingle<PublicInvoiceRow>(),
    supabase
      .from("invoice_items")
      .select("id, invoice_id, product_name_at_time, quantity, unit_price, total_price")
      .eq("invoice_id", tokenRow.invoice_id)
      .returns<PublicInvoiceItemRow[]>(),
    getStoreLabel(supabase)
  ]);

  if (invoiceResult.error) {
    throw invoiceResult.error;
  }

  if (itemsResult.error) {
    throw itemsResult.error;
  }

  if (!invoiceResult.data) {
    return { state: "invalid" };
  }

  return {
    state: "ok",
    data: {
      invoice_number: invoiceResult.data.invoice_number,
      invoice_date: invoiceResult.data.invoice_date,
      store_name: storeName,
      total: invoiceResult.data.total_amount,
      items: (itemsResult.data ?? []).map((item) => ({
        product_name: item.product_name_at_time,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.total_price
      }))
    }
  };
}

export async function buildWhatsAppMessage(
  supabase: SupabaseAdminClient,
  options: {
    templateKey: WhatsAppTemplateKey;
    referenceType: string;
    referenceId: string;
    payload: Record<string, unknown>;
  }
) {
  const storeName = await getStoreLabel(supabase);
  const storePhone = getStringValue(options.payload.store_phone) || (await getStorePhone(supabase));

  switch (options.templateKey) {
    case "receipt_share": {
      const receiptUrl = getStringValue(options.payload.receipt_url);
      const { data, error } = await supabase
        .from("invoices")
        .select("invoice_number, invoice_date, total_amount")
        .eq("id", options.referenceId)
        .maybeSingle<InvoiceWhatsAppRow>();

      if (error) {
        throw error;
      }

      if (!data || !receiptUrl) {
        throw new Error("ERR_WHATSAPP_DELIVERY_FAILED");
      }

      return [
        `🧾 *فاتورة بيع*`,
        "",
        `*${storeName}*`,
        "━━━━━━━━━━━━━━",
        `🔢 رقم الفاتورة: ${data.invoice_number}`,
        `📅 التاريخ: ${data.invoice_date}`,
        `💰 الإجمالي: ${data.total_amount} د.أ`,
        "━━━━━━━━━━━━━━",
        `🔗 رابط الإيصال: ${receiptUrl}`,
        "",
        "شكراً لتسوقكم معنا 🙏"
      ].join("\n");
    }

    case "debt_due_reminder":
    case "debt_overdue": {
      const { data, error } = await supabase
        .from("debt_entries")
        .select("due_date, remaining_amount, debt_customers(name)")
        .eq("id", options.referenceId)
        .maybeSingle<DebtReminderRow>();

      if (error) {
        throw error;
      }

      if (!data || !data.debt_customers) {
        throw new Error("ERR_WHATSAPP_DELIVERY_FAILED");
      }

      const isOverdue = options.templateKey === "debt_overdue";
      return [
        isOverdue ? "⚠️ *إشعار: دين متأخر*" : "⏰ *تذكير ودي*",
        "",
        `مرحباً ${data.debt_customers.name}،`,
        "",
        `لديك رصيد ${isOverdue ? "متأخر" : "مستحق"} بقيمة *${data.remaining_amount} د.أ*`,
        `📅 تاريخ الاستحقاق: ${data.due_date}`,
        `📞 ${storePhone}`,
        "",
        `*${storeName}*`
      ].join("\n");
    }

    case "maintenance_ready": {
      const { data, error } = await supabase
        .from("maintenance_jobs")
        .select("job_number, customer_name")
        .eq("id", options.referenceId)
        .maybeSingle<MaintenanceWhatsAppRow>();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("ERR_WHATSAPP_DELIVERY_FAILED");
      }

      return [
        "🛠️ *طلب الصيانة جاهز*",
        "",
        `مرحباً ${data.customer_name}،`,
        `أصبح طلب الصيانة رقم *${data.job_number}* جاهزاً للتسليم.`,
        `📞 ${storePhone}`,
        "",
        `*${storeName}*`
      ].join("\n");
    }
  }
}
