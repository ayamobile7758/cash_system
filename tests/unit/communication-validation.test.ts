import {
  issueReceiptLinkSchema,
  revokeReceiptLinkSchema,
  runDebtReminderSchema,
  sendWhatsAppMessageSchema
} from "@/lib/validations/communication";

describe("communication validation", () => {
  it("accepts a valid receipt-link payload", () => {
    const parsed = issueReceiptLinkSchema.safeParse({
      invoice_id: "11111111-1111-4111-8111-111111111111",
      channel: "share",
      expires_in_hours: 24,
      force_reissue: true
    });

    expect(parsed.success).toBe(true);
  });

  it("requires token_id or invoice_id when revoking a receipt link", () => {
    const parsed = revokeReceiptLinkSchema.safeParse({});

    expect(parsed.success).toBe(false);
  });

  it("rejects invalid debt reminder dates", () => {
    const parsed = runDebtReminderSchema.safeParse({
      mode: "due",
      as_of_date: "03-11-2026"
    });

    expect(parsed.success).toBe(false);
  });

  it("requires receipt_url for receipt-share WhatsApp messages", () => {
    const parsed = sendWhatsAppMessageSchema.safeParse({
      template_key: "receipt_share",
      target_phone: "0790000000",
      reference_type: "invoice",
      reference_id: "11111111-1111-4111-8111-111111111111",
      payload: {},
      idempotency_key: "22222222-2222-4222-8222-222222222222"
    });

    expect(parsed.success).toBe(false);
  });
});
