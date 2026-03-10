import {
  createMaintenanceJobSchema,
  updateMaintenanceStatusSchema
} from "@/lib/validations/maintenance";

describe("maintenance validations", () => {
  it("accepts a valid maintenance create payload", () => {
    const parsed = createMaintenanceJobSchema.safeParse({
      customer_name: "محمد",
      customer_phone: "0790000000",
      device_type: "Samsung S24",
      issue_description: "تبديل شاشة",
      estimated_cost: 35,
      notes: "فحص أولي",
      idempotency_key: "11111111-1111-4111-8111-111111111111"
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects delivery without a final amount", () => {
    const parsed = updateMaintenanceStatusSchema.safeParse({
      status: "delivered",
      payment_account_id: "22222222-2222-4222-8222-222222222222"
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects positive delivery without a payment account", () => {
    const parsed = updateMaintenanceStatusSchema.safeParse({
      status: "delivered",
      final_amount: 25
    });

    expect(parsed.success).toBe(false);
  });
});
