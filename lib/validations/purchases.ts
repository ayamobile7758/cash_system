import { z } from "zod";

export const createPurchaseItemSchema = z.object({
  product_id: z.string().uuid("معرف المنتج غير صالح"),
  quantity: z.number().int("الكمية يجب أن تكون رقمًا صحيحًا").positive("الكمية يجب أن تكون أكبر من صفر"),
  unit_cost: z.number().min(0, "تكلفة الوحدة يجب أن تكون صفرًا أو أكبر")
});

export const createPurchaseSchema = z
  .object({
    supplier_id: z.string().uuid("معرف المورد غير صالح").optional(),
    items: z.array(createPurchaseItemSchema).min(1, "يجب إضافة عنصر شراء واحد على الأقل"),
    is_paid: z.boolean(),
    payment_account_id: z.string().uuid("معرف حساب الدفع غير صالح").optional(),
    notes: z.string().trim().max(1000, "الملاحظات طويلة جدًا").optional(),
    idempotency_key: z.string().uuid("مفتاح منع التكرار غير صالح")
  })
  .superRefine((value, ctx) => {
    if (value.is_paid && !value.payment_account_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "حساب الدفع مطلوب عندما يكون الشراء نقديًا.",
        path: ["payment_account_id"]
      });
    }

    if (!value.is_paid && !value.supplier_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "المورد مطلوب عندما يكون الشراء على الحساب.",
        path: ["supplier_id"]
      });
    }
  });

export const createSupplierPaymentSchema = z.object({
  supplier_id: z.string().uuid("معرف المورد غير صالح"),
  account_id: z.string().uuid("معرف الحساب غير صالح"),
  amount: z.number().positive("المبلغ يجب أن يكون أكبر من صفر"),
  notes: z.string().trim().max(255, "الملاحظات طويلة جدًا").optional(),
  idempotency_key: z.string().uuid("مفتاح منع التكرار غير صالح")
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type CreateSupplierPaymentInput = z.infer<typeof createSupplierPaymentSchema>;
