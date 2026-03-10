import { z } from "zod";

export const createTopupSchema = z
  .object({
    account_id: z.string().uuid("معرف الحساب غير صالح"),
    amount: z.number().positive("المبلغ يجب أن يكون أكبر من صفر"),
    profit_amount: z.number().min(0, "الربح يجب أن يكون صفرًا أو أكبر"),
    supplier_id: z.string().uuid("معرف شركة الشحن غير صالح").optional(),
    notes: z.string().trim().max(255, "الملاحظات طويلة جدًا").optional(),
    idempotency_key: z.string().uuid("مفتاح منع التكرار غير صالح")
  })
  .superRefine((value, ctx) => {
    if (value.profit_amount > value.amount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ربح الشحن لا يمكن أن يتجاوز المبلغ المستلم.",
        path: ["profit_amount"]
      });
    }
  });

export const createTransferSchema = z
  .object({
    from_account_id: z.string().uuid("معرف الحساب المصدر غير صالح"),
    to_account_id: z.string().uuid("معرف الحساب الوجهة غير صالح"),
    amount: z.number().positive("المبلغ يجب أن يكون أكبر من صفر"),
    notes: z.string().trim().max(255, "الملاحظات طويلة جدًا").optional(),
    idempotency_key: z.string().uuid("مفتاح منع التكرار غير صالح")
  })
  .superRefine((value, ctx) => {
    if (value.from_account_id === value.to_account_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "لا يمكن التحويل إلى نفس الحساب.",
        path: ["to_account_id"]
      });
    }
  });

export type CreateTopupInput = z.infer<typeof createTopupSchema>;
export type CreateTransferInput = z.infer<typeof createTransferSchema>;
