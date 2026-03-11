import { z } from "zod";

const receiptLinkChannelSchema = z.enum(["share", "whatsapp"], {
  message: "قناة مشاركة الإيصال غير صالحة."
});

const debtReminderModeSchema = z.enum(["due", "overdue"], {
  message: "نمط مجدول التذكير غير صالح."
});

const whatsappTemplateSchema = z.enum(
  ["receipt_share", "debt_due_reminder", "debt_overdue", "maintenance_ready"],
  {
    message: "قالب واتساب غير صالح."
  }
);

const whatsappReferenceTypeSchema = z.enum(["invoice", "debt_entry", "maintenance_job", "debt_customer"], {
  message: "نوع المرجع غير صالح."
});

export const issueReceiptLinkSchema = z.object({
  invoice_id: z.string().uuid("معرف الفاتورة غير صالح."),
  channel: receiptLinkChannelSchema.default("share"),
  expires_in_hours: z
    .number()
    .int("مدة الصلاحية يجب أن تكون عددًا صحيحًا.")
    .min(1, "مدة الصلاحية يجب أن تكون ساعة واحدة على الأقل.")
    .max(720, "مدة الصلاحية القصوى 720 ساعة.")
    .default(168),
  force_reissue: z.boolean().default(false)
});

export const revokeReceiptLinkSchema = z
  .object({
    token_id: z.string().uuid("معرف الرابط غير صالح.").optional(),
    invoice_id: z.string().uuid("معرف الفاتورة غير صالح.").optional()
  })
  .superRefine((value, ctx) => {
    if (!value.token_id && !value.invoice_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "يجب تمرير token_id أو invoice_id لإلغاء الرابط.",
        path: ["token_id"]
      });
    }
  });

export const runDebtReminderSchema = z.object({
  mode: debtReminderModeSchema,
  as_of_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "التاريخ يجب أن يكون بصيغة YYYY-MM-DD.")
});

export const sendWhatsAppMessageSchema = z
  .object({
    template_key: whatsappTemplateSchema,
    target_phone: z.string().trim().min(8, "رقم الهاتف المطلوب قصير جدًا.").max(30, "رقم الهاتف طويل جدًا."),
    reference_type: whatsappReferenceTypeSchema,
    reference_id: z.string().uuid("معرف المرجع غير صالح."),
    payload: z.record(z.string(), z.unknown()).default({}),
    idempotency_key: z.string().uuid("مفتاح منع التكرار غير صالح.")
  })
  .superRefine((value, ctx) => {
    if (value.template_key === "receipt_share") {
      const receiptUrl = value.payload.receipt_url;
      if (typeof receiptUrl !== "string" || !receiptUrl.startsWith("http")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "يجب تمرير receipt_url صالح لرسالة مشاركة الإيصال.",
          path: ["payload", "receipt_url"]
        });
      }
    }
  });

export type IssueReceiptLinkInput = z.infer<typeof issueReceiptLinkSchema>;
export type RevokeReceiptLinkInput = z.infer<typeof revokeReceiptLinkSchema>;
export type RunDebtReminderInput = z.infer<typeof runDebtReminderSchema>;
export type SendWhatsAppMessageInput = z.infer<typeof sendWhatsAppMessageSchema>;
