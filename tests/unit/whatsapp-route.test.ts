import { NextResponse } from "next/server";
import { POST } from "@/app/api/messages/whatsapp/send/route";
import { authorizeRequest } from "@/lib/api/common";
import { buildWhatsAppDeepLink, buildWhatsAppMessage } from "@/lib/api/communication";

vi.mock("@/lib/api/common", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/common")>("@/lib/api/common");
  return {
    ...actual,
    authorizeRequest: vi.fn()
  };
});

vi.mock("@/lib/api/communication", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/communication")>("@/lib/api/communication");
  return {
    ...actual,
    buildWhatsAppMessage: vi.fn(),
    buildWhatsAppDeepLink: vi.fn()
  };
});

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/messages/whatsapp/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/messages/whatsapp/send", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the authorization response when blocked", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: false,
      response: NextResponse.json(
        { success: false, error: { code: "ERR_API_ROLE_FORBIDDEN", message: "forbidden" } },
        { status: 403 }
      )
    });

    const response = await POST(createRequest({}));
    expect(response.status).toBe(403);
  });

  it("builds the message, logs the attempt, and returns a wa.me URL", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        delivery_log_id: "log-1",
        status: "queued"
      },
      error: null
    });

    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: { rpc }
    } as never);
    vi.mocked(buildWhatsAppMessage).mockResolvedValue("hello");
    vi.mocked(buildWhatsAppDeepLink).mockReturnValue("https://wa.me/962790000000?text=hello");

    const response = await POST(
      createRequest({
        template_key: "receipt_share",
        target_phone: "0790000000",
        reference_type: "invoice",
        reference_id: "11111111-1111-4111-8111-111111111111",
        payload: {
          receipt_url: "https://aya.example/r/demo"
        },
        idempotency_key: "22222222-2222-4222-8222-222222222222"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.wa_url).toBe("https://wa.me/962790000000?text=hello");
    expect(rpc).toHaveBeenCalledWith("create_whatsapp_delivery_log", {
      p_template_key: "receipt_share",
      p_target_phone: "0790000000",
      p_reference_type: "invoice",
      p_reference_id: "11111111-1111-4111-8111-111111111111",
      p_idempotency_key: "22222222-2222-4222-8222-222222222222",
      p_created_by: "admin-1"
    });
  });

  it("maps template-build failures to ERR_WHATSAPP_DELIVERY_FAILED", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      authorized: true,
      role: "admin",
      userId: "admin-1",
      supabase: {
        rpc: vi.fn()
      }
    } as never);
    vi.mocked(buildWhatsAppMessage).mockRejectedValue(new Error("broken"));

    const response = await POST(
      createRequest({
        template_key: "receipt_share",
        target_phone: "0790000000",
        reference_type: "invoice",
        reference_id: "11111111-1111-4111-8111-111111111111",
        payload: {
          receipt_url: "https://aya.example/r/demo"
        },
        idempotency_key: "22222222-2222-4222-8222-222222222222"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload.error.code).toBe("ERR_WHATSAPP_DELIVERY_FAILED");
  });
});
