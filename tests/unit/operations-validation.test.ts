import { createTopupSchema, createTransferSchema } from "@/lib/validations/operations";

describe("operations validations", () => {
  it("accepts a valid topup payload", () => {
    const parsed = createTopupSchema.safeParse({
      account_id: "11111111-1111-1111-8111-111111111111",
      amount: 100,
      profit_amount: 3,
      supplier_id: "22222222-2222-2222-8222-222222222222",
      notes: "شحن سريع",
      idempotency_key: "33333333-3333-3333-8333-333333333333"
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects a topup profit greater than the amount", () => {
    const parsed = createTopupSchema.safeParse({
      account_id: "11111111-1111-1111-8111-111111111111",
      amount: 50,
      profit_amount: 70,
      idempotency_key: "33333333-3333-3333-8333-333333333333"
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts a valid internal transfer payload", () => {
    const parsed = createTransferSchema.safeParse({
      from_account_id: "11111111-1111-1111-8111-111111111111",
      to_account_id: "22222222-2222-2222-8222-222222222222",
      amount: 25,
      notes: "نقل سيولة",
      idempotency_key: "33333333-3333-3333-8333-333333333333"
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects transfers to the same account", () => {
    const parsed = createTransferSchema.safeParse({
      from_account_id: "11111111-1111-1111-8111-111111111111",
      to_account_id: "11111111-1111-1111-8111-111111111111",
      amount: 25,
      idempotency_key: "33333333-3333-3333-8333-333333333333"
    });

    expect(parsed.success).toBe(false);
  });
});
