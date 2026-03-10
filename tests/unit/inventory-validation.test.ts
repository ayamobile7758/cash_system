import { completeInventoryCountSchema, createInventoryCountSchema } from "@/lib/validations/inventory";

describe("completeInventoryCountSchema", () => {
  it("accepts a valid inventory completion payload", () => {
    const parsed = completeInventoryCountSchema.safeParse({
      inventory_count_id: "11111111-1111-1111-8111-111111111111",
      items: [
        {
          inventory_count_item_id: "22222222-2222-2222-8222-222222222222",
          actual_quantity: 8,
          reason: "فرق جرد"
        }
      ]
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects empty items and invalid quantities", () => {
    const parsed = completeInventoryCountSchema.safeParse({
      inventory_count_id: "11111111-1111-1111-8111-111111111111",
      items: [
        {
          inventory_count_item_id: "22222222-2222-2222-8222-222222222222",
          actual_quantity: -2
        }
      ]
    });

    expect(parsed.success).toBe(false);
  });
});

describe("createInventoryCountSchema", () => {
  it("accepts a valid selected-count payload", () => {
    const parsed = createInventoryCountSchema.safeParse({
      count_type: "daily",
      scope: "selected",
      product_ids: ["22222222-2222-2222-8222-222222222222"],
      notes: "جرد سريع"
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects selected scope without products", () => {
    const parsed = createInventoryCountSchema.safeParse({
      count_type: "daily",
      scope: "selected",
      product_ids: []
    });

    expect(parsed.success).toBe(false);
  });
});
