import {
  ALL_PERMISSIONS_TOKEN,
  getBasePermissions,
  hasAnyPermission,
  hasPermission,
  resolvePermissionContext
} from "@/lib/permissions";

function buildSupabase(rows: unknown[]) {
  const chain = {
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    returns: vi.fn().mockResolvedValue({
      data: rows,
      error: null
    })
  };

  return {
    from: vi.fn(() => ({
      select: vi.fn(() => chain)
    }))
  };
}

describe("permissions model", () => {
  it("gives admin the wildcard base permission", async () => {
    const context = await resolvePermissionContext(
      buildSupabase([]) as never,
      "admin-1",
      "admin"
    );

    expect(getBasePermissions("admin")).toEqual([ALL_PERMISSIONS_TOKEN]);
    expect(context.permissions).toEqual([ALL_PERMISSIONS_TOKEN]);
    expect(context.bundleKeys).toEqual([]);
  });

  it("merges POS base permissions with active bundle permissions", async () => {
    const context = await resolvePermissionContext(
      buildSupabase([
        {
          bundle_id: "bundle-1",
          permission_bundles: {
            id: "bundle-1",
            key: "inventory_clerk",
            label: "Inventory Clerk",
            base_role: "pos_staff",
            permissions: ["inventory.read", "inventory.count.start", "inventory.count.complete"],
            max_discount_percentage: null,
            discount_requires_approval: false,
            is_active: true
          }
        },
        {
          bundle_id: "bundle-2",
          permission_bundles: {
            id: "bundle-2",
            key: "sales_discount_guarded",
            label: "Guarded Discount",
            base_role: "pos_staff",
            permissions: ["sales.discount.override"],
            max_discount_percentage: 15,
            discount_requires_approval: true,
            is_active: true
          }
        }
      ]) as never,
      "pos-1",
      "pos_staff"
    );

    expect(hasPermission(context.permissions, "sales.create")).toBe(true);
    expect(hasPermission(context.permissions, "inventory.read")).toBe(true);
    expect(hasAnyPermission(context.permissions, ["inventory.read", "maintenance.read"])).toBe(true);
    expect(context.bundleKeys).toEqual(["inventory_clerk", "sales_discount_guarded"]);
    expect(context.maxDiscountPercentage).toBe(15);
    expect(context.discountRequiresApproval).toBe(true);
  });
});
