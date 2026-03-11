import { z } from "zod";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "التاريخ يجب أن يكون بصيغة YYYY-MM-DD");

export const advancedReportGroupBySchema = z.enum(["day", "week", "month"], {
  message: "صيغة التجميع غير مدعومة."
});

export const advancedReportDimensionSchema = z.enum(
  ["account", "entry_type", "expense_category", "supplier", "maintenance_status"],
  {
    message: "بُعد التحليل غير مدعوم."
  }
);

export const advancedReportQuerySchema = z
  .object({
    from_date: isoDateSchema,
    to_date: isoDateSchema,
    compare_from_date: isoDateSchema.optional(),
    compare_to_date: isoDateSchema.optional(),
    group_by: advancedReportGroupBySchema.default("day"),
    dimension: advancedReportDimensionSchema.default("account"),
    created_by: z.string().uuid("معرف المستخدم غير صالح").optional(),
    status: z.enum(["active", "partially_returned", "returned", "cancelled"]).optional(),
    pos_terminal_code: z.string().trim().min(1).max(50).optional()
  })
  .superRefine((value, ctx) => {
    if ((value.compare_from_date && !value.compare_to_date) || (!value.compare_from_date && value.compare_to_date)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "يجب إرسال compare_from_date وcompare_to_date معًا.",
        path: ["compare_from_date"]
      });
    }

    if (value.from_date > value.to_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "فترة التقرير الحالية غير مرتبة بشكل صحيح.",
        path: ["from_date"]
      });
    }

    if (value.compare_from_date && value.compare_to_date && value.compare_from_date > value.compare_to_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "فترة المقارنة غير مرتبة بشكل صحيح.",
        path: ["compare_from_date"]
      });
    }
  });

export type AdvancedReportQueryInput = z.infer<typeof advancedReportQuerySchema>;
export type AdvancedReportGroupBy = z.infer<typeof advancedReportGroupBySchema>;
export type AdvancedReportDimension = z.infer<typeof advancedReportDimensionSchema>;
