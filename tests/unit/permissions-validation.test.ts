import {
  manageRoleAssignmentSchema,
  previewPermissionBundleSchema
} from "@/lib/validations/permissions";

describe("permissions validations", () => {
  it("accepts a valid role assignment payload", () => {
    const parsed = manageRoleAssignmentSchema.safeParse({
      user_id: "11111111-1111-1111-8111-111111111111",
      bundle_key: "inventory_clerk",
      notes: "Night shift bundle"
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects an invalid assignment payload", () => {
    const parsed = manageRoleAssignmentSchema.safeParse({
      user_id: "bad-id",
      bundle_key: ""
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts a valid preview payload", () => {
    const parsed = previewPermissionBundleSchema.safeParse({
      bundle_key: "sales_supervisor"
    });

    expect(parsed.success).toBe(true);
  });
});
