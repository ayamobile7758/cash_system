import { createSupplierSchema, updateSupplierSchema } from "@/lib/validations/suppliers";

describe("supplier validations", () => {
  it("accepts a valid supplier payload", () => {
    const parsed = createSupplierSchema.safeParse({
      name: "شركة الأمل",
      phone: "0790000000",
      address: "عمان",
      is_active: true
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects an empty supplier name", () => {
    const parsed = createSupplierSchema.safeParse({
      name: "   ",
      is_active: true
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts a valid update payload", () => {
    const parsed = updateSupplierSchema.safeParse({
      supplier_id: "11111111-1111-1111-8111-111111111111",
      name: "شركة الأمل",
      phone: "0790000000",
      address: "عمان",
      is_active: false
    });

    expect(parsed.success).toBe(true);
  });
});
