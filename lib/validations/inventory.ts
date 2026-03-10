import { z } from "zod";

const inventoryItemSchema = z
  .object({
    inventory_count_item_id: z.string().uuid("معرف بند الجرد غير صالح.").optional(),
    product_id: z.string().uuid("معرف المنتج غير صالح.").optional(),
    actual_quantity: z.coerce
      .number()
      .int("الكمية الفعلية يجب أن تكون عددًا صحيحًا.")
      .min(0, "الكمية الفعلية يجب أن تكون صفرًا أو أكبر."),
    reason: z
      .string()
      .trim()
      .max(255, "سبب الفرق يجب ألا يتجاوز 255 حرفًا.")
      .optional()
  })
  .superRefine((value, ctx) => {
    if (!value.inventory_count_item_id && !value.product_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "يجب تمرير معرف بند الجرد أو معرف المنتج.",
        path: ["inventory_count_item_id"]
      });
    }
  });

export const createInventoryCountSchema = z
  .object({
    count_type: z.enum(["daily", "weekly", "monthly"], {
      message: "نوع الجرد غير صالح."
    }),
    scope: z.enum(["all", "selected"], {
      message: "نطاق الجرد غير صالح."
    }),
    product_ids: z.array(z.string().uuid("معرف المنتج غير صالح.")).optional(),
    notes: z
      .string()
      .trim()
      .max(500, "ملاحظات الجرد يجب ألا تتجاوز 500 حرف.")
      .optional()
  })
  .superRefine((value, ctx) => {
    if (value.scope === "selected" && (!value.product_ids || value.product_ids.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "اختر منتجًا واحدًا على الأقل عند الجرد المحدد.",
        path: ["product_ids"]
      });
    }
  });

export const completeInventoryCountSchema = z.object({
  inventory_count_id: z.string().uuid("معرف الجرد غير صالح."),
  items: z.array(inventoryItemSchema).min(1, "يجب إدخال بند واحد على الأقل.")
});

export type CreateInventoryCountInput = z.infer<typeof createInventoryCountSchema>;
export type CompleteInventoryCountInput = z.infer<typeof completeInventoryCountSchema>;
