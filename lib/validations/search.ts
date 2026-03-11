import { z } from "zod";

export const searchEntitySchema = z.enum(["product", "invoice", "debt_customer", "maintenance_job"], {
  message: "نوع البحث غير مدعوم."
});

export const globalSearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, "الاستعلام قصير جدًا. أدخل حرفين على الأقل.")
    .max(100, "الاستعلام طويل جدًا."),
  entity: searchEntitySchema.optional(),
  limit: z.coerce
    .number()
    .int("حد النتائج يجب أن يكون عددًا صحيحًا.")
    .min(1, "حد النتائج الأدنى هو 1.")
    .max(20, "حد النتائج الأقصى هو 20.")
    .default(12)
});

export type SearchEntity = z.infer<typeof searchEntitySchema>;
export type GlobalSearchQueryInput = z.infer<typeof globalSearchQuerySchema>;
