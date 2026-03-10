import { createPurchaseSchema, createSupplierPaymentSchema } from "@/lib/validations/purchases";

describe("purchase validations", () => {
  it("accepts a valid cash purchase payload", () => {
    const parsed = createPurchaseSchema.safeParse({
      supplier_id: "11111111-1111-1111-8111-111111111111",
      items: [
        {
          product_id: "22222222-2222-2222-8222-222222222222",
          quantity: 2,
          unit_cost: 3.5
        }
      ],
      is_paid: true,
      payment_account_id: "33333333-3333-3333-8333-333333333333",
      idempotency_key: "44444444-4444-4444-8444-444444444444"
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects credit purchases without a supplier", () => {
    const parsed = createPurchaseSchema.safeParse({
      items: [
        {
          product_id: "22222222-2222-2222-8222-222222222222",
          quantity: 2,
          unit_cost: 3.5
        }
      ],
      is_paid: false,
      idempotency_key: "44444444-4444-4444-8444-444444444444"
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects cash purchases without a payment account", () => {
    const parsed = createPurchaseSchema.safeParse({
      supplier_id: "11111111-1111-1111-8111-111111111111",
      items: [
        {
          product_id: "22222222-2222-2222-8222-222222222222",
          quantity: 2,
          unit_cost: 3.5
        }
      ],
      is_paid: true,
      idempotency_key: "44444444-4444-4444-8444-444444444444"
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts a valid supplier payment payload", () => {
    const parsed = createSupplierPaymentSchema.safeParse({
      supplier_id: "11111111-1111-1111-8111-111111111111",
      account_id: "33333333-3333-3333-8333-333333333333",
      amount: 50,
      idempotency_key: "44444444-4444-4444-8444-444444444444"
    });

    expect(parsed.success).toBe(true);
  });
});
