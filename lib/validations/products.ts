import { z } from "zod";

export const PRODUCT_CATEGORY_VALUES = [
  "device",
  "accessory",
  "sim",
  "service_repair",
  "service_general"
] as const;

export const productCategorySchema = z.enum(PRODUCT_CATEGORY_VALUES, {
  message: "تصنيف المنتج غير صالح"
});

const productBaseSchema = z.object({
  name: z.string().trim().min(1, "اسم المنتج مطلوب").max(200, "اسم المنتج طويل جدًا"),
  category: productCategorySchema,
  sku: z.string().trim().max(50, "رمز المنتج طويل جدًا").optional().nullable(),
  description: z.string().trim().max(1000, "وصف المنتج طويل جدًا").optional().nullable(),
  sale_price: z.coerce.number().min(0, "سعر البيع يجب أن يكون صفرًا أو أكبر"),
  cost_price: z.coerce.number().min(0, "سعر التكلفة يجب أن يكون صفرًا أو أكبر").optional().nullable(),
  stock_quantity: z.coerce
    .number()
    .int("الكمية يجب أن تكون عددًا صحيحًا")
    .min(0, "الكمية يجب أن تكون صفرًا أو أكبر"),
  min_stock_level: z.coerce
    .number()
    .int("حد التنبيه يجب أن يكون عددًا صحيحًا")
    .min(0, "حد التنبيه يجب أن يكون صفرًا أو أكبر"),
  track_stock: z.boolean(),
  is_quick_add: z.boolean(),
  is_active: z.boolean()
});

export const createProductSchema = productBaseSchema.extend({
  track_stock: z.boolean().default(true),
  is_quick_add: z.boolean().default(false),
  is_active: z.boolean().default(true)
});

export const updateProductSchema = productBaseSchema.partial().superRefine((value, ctx) => {
  if (Object.keys(value).length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "يجب إرسال حقل واحد على الأقل للتعديل."
    });
  }
});

export type ProductCategory = z.infer<typeof productCategorySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
