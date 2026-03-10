import { z } from "zod";

export const createMaintenanceJobSchema = z.object({
  customer_name: z.string().trim().min(1, "اسم العميل مطلوب").max(100, "اسم العميل طويل جدًا"),
  customer_phone: z.string().trim().max(20, "رقم الهاتف طويل جدًا").optional(),
  device_type: z.string().trim().min(1, "نوع الجهاز مطلوب").max(100, "نوع الجهاز طويل جدًا"),
  issue_description: z.string().trim().min(1, "وصف العطل مطلوب").max(2000, "وصف العطل طويل جدًا"),
  estimated_cost: z.number().min(0, "التكلفة التقديرية يجب أن تكون صفرًا أو أكبر").optional(),
  notes: z.string().trim().max(1000, "الملاحظات طويلة جدًا").optional(),
  idempotency_key: z.string().uuid("مفتاح منع التكرار غير صالح")
});

export const updateMaintenanceStatusSchema = z
  .object({
    status: z.enum(["in_progress", "ready", "delivered", "cancelled"], {
      message: "حالة الصيانة غير صالحة"
    }),
    final_amount: z.number().min(0, "المبلغ النهائي يجب أن يكون صفرًا أو أكبر").optional(),
    payment_account_id: z.string().uuid("معرف حساب الصيانة غير صالح").optional(),
    notes: z.string().trim().max(1000, "الملاحظات طويلة جدًا").optional()
  })
  .superRefine((value, ctx) => {
    if (value.status === "delivered") {
      if (value.final_amount == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "المبلغ النهائي مطلوب عند تسليم الجهاز.",
          path: ["final_amount"]
        });
      }

      if ((value.final_amount ?? 0) > 0 && !value.payment_account_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "حساب الصيانة مطلوب عند تسليم مبلغ موجب.",
          path: ["payment_account_id"]
        });
      }
    }
  });

export type CreateMaintenanceJobInput = z.infer<typeof createMaintenanceJobSchema>;
export type UpdateMaintenanceStatusInput = z.infer<typeof updateMaintenanceStatusSchema>;
