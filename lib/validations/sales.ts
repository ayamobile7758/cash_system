import { z } from "zod";

export const saleItemSchema = z.object({
  product_id: z.string().uuid("معرف المنتج غير صالح"),
  quantity: z.number().int("الكمية يجب أن تكون عددًا صحيحًا").min(1, "الكمية يجب أن تكون 1 على الأقل"),
  discount_percentage: z
    .number()
    .min(0, "الخصم لا يمكن أن يكون سالبًا")
    .max(100, "الخصم لا يمكن أن يتجاوز 100%")
    .default(0)
});

export const salePaymentSchema = z.object({
  account_id: z.string().uuid("معرف الحساب غير صالح"),
  amount: z.number().positive("المبلغ يجب أن يكون أكبر من صفر")
});

export const createSaleSchema = z.object({
  items: z.array(saleItemSchema).min(1, "يجب إضافة منتج واحد على الأقل"),
  payments: z.array(salePaymentSchema).min(1, "يجب تحديد دفعة واحدة على الأقل"),
  customer_id: z.string().uuid("معرف العميل غير صالح").optional(),
  invoice_discount_percentage: z
    .number()
    .min(0, "خصم الفاتورة لا يمكن أن يكون سالبًا")
    .max(100, "خصم الفاتورة لا يمكن أن يتجاوز 100%")
    .default(0),
  pos_terminal_code: z.string().trim().min(1, "رمز الجهاز لا يمكن أن يكون فارغًا").max(30, "رمز الجهاز طويل جدًا").optional(),
  notes: z.string().trim().max(500, "الملاحظات طويلة جدًا").optional(),
  idempotency_key: z.string().uuid("مفتاح منع التكرار غير صالح")
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
