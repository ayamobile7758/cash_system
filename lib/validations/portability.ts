import { z } from "zod";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "التاريخ يجب أن يكون بصيغة YYYY-MM-DD.");

export const exportPackageTypeSchema = z.enum(["json", "csv"], {
  message: "نوع الحزمة غير صالح."
});

export const exportPackageScopeSchema = z.enum(["products", "reports", "customers", "backup"], {
  message: "نطاق التصدير غير صالح."
});

export const exportPackageFiltersSchema = z
  .object({
    active_only: z.boolean().optional(),
    from_date: isoDateSchema.optional(),
    to_date: isoDateSchema.optional(),
    compare_from_date: isoDateSchema.optional(),
    compare_to_date: isoDateSchema.optional(),
    created_by: z.string().uuid("معرّف المستخدم غير صالح.").optional(),
    status: z.string().trim().min(1).max(40).optional(),
    pos_terminal_code: z.string().trim().min(1).max(50).optional()
  })
  .default({});

export const createExportPackageSchema = z
  .object({
    package_type: exportPackageTypeSchema,
    scope: exportPackageScopeSchema,
    filters: exportPackageFiltersSchema
  })
  .superRefine((value, ctx) => {
    if (value.scope === "backup" && value.package_type !== "json") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["package_type"],
        message: "حزمة backup تدعم JSON فقط."
      });
    }
  });

export const importSourceFormatSchema = z.enum(["csv", "json"], {
  message: "صيغة ملف الاستيراد غير صالحة."
});

export const importProductDryRunSchema = z.object({
  mode: z.literal("dry_run"),
  source_format: importSourceFormatSchema,
  source_content: z.string().min(1, "محتوى الملف مطلوب."),
  file_name: z.string().trim().min(1, "اسم الملف مطلوب.").max(200, "اسم الملف طويل جدًا.")
});

export const importProductCommitSchema = z.object({
  mode: z.literal("commit"),
  dry_run_job_id: z.string().uuid("معرّف dry-run غير صالح.")
});

export const importProductsSchema = z.discriminatedUnion("mode", [
  importProductDryRunSchema,
  importProductCommitSchema
]);

export const restoreDrillSchema = z.object({
  backup_id: z.string().uuid("معرّف حزمة النسخ غير صالح."),
  target_env: z.literal("isolated-drill", {
    message: "بيئة الاستعادة يجب أن تكون isolated-drill فقط."
  }),
  idempotency_key: z.string().uuid("مفتاح منع التكرار غير صالح.")
});

export type ExportPackageType = z.infer<typeof exportPackageTypeSchema>;
export type ExportPackageScope = z.infer<typeof exportPackageScopeSchema>;
export type ExportPackageFilters = z.infer<typeof exportPackageFiltersSchema>;
export type CreateExportPackageInput = z.infer<typeof createExportPackageSchema>;
export type ImportSourceFormat = z.infer<typeof importSourceFormatSchema>;
export type ImportProductsInput = z.infer<typeof importProductsSchema>;
export type RestoreDrillInput = z.infer<typeof restoreDrillSchema>;
