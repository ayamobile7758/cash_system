import { z } from "zod";

export const createSupplierSchema = z.object({
  name: z.string().trim().min(1, "اسم المورد مطلوب").max(100, "اسم المورد طويل جدًا"),
  phone: z.string().trim().max(20, "رقم الهاتف طويل جدًا").optional(),
  address: z.string().trim().max(1000, "العنوان طويل جدًا").optional(),
  is_active: z.boolean().default(true)
});

export const updateSupplierSchema = createSupplierSchema.extend({
  supplier_id: z.string().uuid("معرف المورد غير صالح")
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
