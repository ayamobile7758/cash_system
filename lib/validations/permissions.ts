import { z } from "zod";

const bundleKeySchema = z
  .string()
  .trim()
  .min(1, "مفتاح الحزمة مطلوب")
  .max(80, "مفتاح الحزمة طويل جدًا");

export const manageRoleAssignmentSchema = z.object({
  user_id: z.string().uuid("معرف المستخدم غير صالح"),
  bundle_key: bundleKeySchema,
  notes: z.string().trim().max(500, "الملاحظة طويلة جدًا").optional()
});

export const previewPermissionBundleSchema = z.object({
  bundle_key: bundleKeySchema
});

export type ManageRoleAssignmentInput = z.infer<typeof manageRoleAssignmentSchema>;
export type PreviewPermissionBundleInput = z.infer<typeof previewPermissionBundleSchema>;
