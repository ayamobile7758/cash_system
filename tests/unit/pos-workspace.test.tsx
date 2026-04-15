import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PosWorkspace } from "@/components/pos/pos-workspace";
import { usePosCartStore } from "@/stores/pos-cart";

const mockUseProducts = vi.fn();
const mockUsePosAccounts = vi.fn();
const mockUseCustomerSearch = vi.fn();

vi.mock("@/hooks/use-products", () => ({
  useProducts: (...args: unknown[]) => mockUseProducts(...args)
}));

vi.mock("@/hooks/use-pos-accounts", () => ({
  usePosAccounts: () => mockUsePosAccounts()
}));

vi.mock("@/hooks/use-customer-search", () => ({
  useCustomerSearch: (...args: unknown[]) => mockUseCustomerSearch(...args)
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn()
  }
}));

describe("PosWorkspace", () => {
  beforeEach(async () => {
    localStorage.clear();
    usePosCartStore.getState().resetStore();
    await usePosCartStore.persist.rehydrate();

    mockUseProducts.mockReset();
    mockUsePosAccounts.mockReset();
    mockUseCustomerSearch.mockReset();

    mockUseProducts.mockReturnValue({
      products: [
        {
          id: "product-1",
          name: "شاحن سريع",
          category: "accessory",
          sku: "FAST-001",
          description: "USB-C",
          sale_price: 100,
          stock_quantity: 5,
          min_stock_level: 1,
          track_stock: true,
          is_quick_add: true,
          is_active: true,
          created_at: "",
          updated_at: "",
          created_by: "admin-1"
        },
        {
          id: "product-2",
          name: "سماعة بلوتوث",
          category: "accessory",
          sku: "HEAD-001",
          description: "Wireless",
          sale_price: 80,
          stock_quantity: 3,
          min_stock_level: 1,
          track_stock: true,
          is_quick_add: false,
          is_active: true,
          created_at: "",
          updated_at: "",
          created_by: "admin-1"
        }
      ],
      isLoading: false,
      isLoadingMore: false,
      isOffline: false,
      errorMessage: null,
      hasMore: false,
      totalCount: 2,
      loadMore: vi.fn(),
      refresh: vi.fn()
    });

    mockUsePosAccounts.mockReturnValue({
      accounts: [
        {
          id: "account-1",
          name: "الصندوق",
          type: "cash",
          module_scope: "core",
          fee_percentage: 0,
          is_active: true,
          display_order: 1,
          created_at: "",
          updated_at: ""
        }
      ],
      isLoading: false,
      isOffline: false,
      errorMessage: null,
      refresh: vi.fn()
    });

    mockUseCustomerSearch.mockReturnValue({
      results: [
        {
          id: "customer-1",
          name: "عميل اختبار",
          phone: "0790000000",
          current_balance: 25
        }
      ],
      isLoading: false
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("autofocuses the search input and forwards filters to the products hook", async () => {
    render(<PosWorkspace maxDiscountPercentage={null} />);

    const searchInput = await screen.findByRole("searchbox");

    await waitFor(
      () => {
        expect(searchInput).toHaveFocus();
      },
      { timeout: 4000 }
    );

    fireEvent.change(searchInput, { target: { value: "شاحن" } });

    await waitFor(
      () => {
        expect(mockUseProducts).toHaveBeenLastCalledWith(
          expect.objectContaining({
            searchQuery: "شاحن",
            category: "all"
          })
        );
      },
      { timeout: 10000 }
    );

    expect(globalThis.fetch).not.toHaveBeenCalled();
  }, 30000);

  it("adds a product to the local cart without triggering a write request", async () => {
    render(<PosWorkspace maxDiscountPercentage={null} />);

    const quickAddButton = screen.getAllByRole("button", { name: /شاحن سريع/i })[0];
    fireEvent.click(quickAddButton);

    await waitFor(() => {
      expect(usePosCartStore.getState().items).toHaveLength(1);
    });

    expect(globalThis.fetch).not.toHaveBeenCalled();
  }, 30000);
  it("adds the first matching result when Enter is pressed in search", async () => {
    render(<PosWorkspace maxDiscountPercentage={null} />);

    const searchInput = await screen.findByRole("searchbox");

    fireEvent.change(searchInput, { target: { value: "FAST-001" } });
    fireEvent.keyDown(searchInput, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(usePosCartStore.getState().items).toHaveLength(1);
    });

    expect(usePosCartStore.getState().items[0]?.product_id).toBe("product-1");
    expect(searchInput).toHaveValue("");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  }, 30000);

  it("requires explicit amount confirmation before completing overlay payment", async () => {
    render(<PosWorkspace maxDiscountPercentage={null} />);

    const quickAddButton = screen.getAllByRole("button", { name: /شاحن سريع/i })[0];
    fireEvent.click(quickAddButton);

    await waitFor(() => {
      expect(usePosCartStore.getState().items).toHaveLength(1);
    });

    fireEvent.click(await screen.findByRole("button", { name: "خيارات دفع أخرى" }));

    const amountInput = await screen.findByLabelText("المبلغ المستلم");
    const confirmPaymentButton = screen.getByRole("button", { name: "تأكيد الدفع" });

    fireEvent.change(amountInput, { target: { value: "80" } });

    await waitFor(() => {
      expect(screen.getByText("يجب الدفع كامل المبلغ")).toBeVisible();
      expect(confirmPaymentButton).toBeDisabled();
    });

    fireEvent.change(amountInput, { target: { value: "100" } });

    await waitFor(() => {
      expect(screen.getByLabelText("الباقي")).toHaveTextContent(/الباقي:/);
      expect(confirmPaymentButton).toBeEnabled();
    });
  }, 30000);

  it("hydrates the smart rail method from localStorage when the stored method is valid", async () => {
    localStorage.setItem("aya.pos.lastPaymentMethod", "card");

    mockUsePosAccounts.mockReturnValue({
      accounts: [
        {
          id: "account-1",
          name: "الصندوق",
          type: "cash",
          module_scope: "core",
          fee_percentage: 0,
          is_active: true,
          display_order: 1,
          created_at: "",
          updated_at: ""
        },
        {
          id: "account-2",
          name: "بطاقة",
          type: "card",
          module_scope: "core",
          fee_percentage: 0,
          is_active: true,
          display_order: 2,
          created_at: "",
          updated_at: ""
        }
      ],
      isLoading: false,
      isOffline: false,
      errorMessage: null,
      refresh: vi.fn()
    });

    render(<PosWorkspace maxDiscountPercentage={null} />);

    fireEvent.click(screen.getAllByRole("button", { name: /شاحن سريع/i })[0]);

    await waitFor(() => {
      expect(usePosCartStore.getState().selectedAccountId).toBe("account-2");
    });

    expect(await screen.findByRole("button", { name: /^دفع بطاقة/ })).toBeVisible();
  }, 30000);

  it("submits the smart rail payment inline and persists the successful method", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            invoice_id: "invoice-1",
            invoice_number: "INV-1",
            total: 100,
            change: 0
          }
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );

    render(<PosWorkspace maxDiscountPercentage={null} />);

    fireEvent.click(screen.getAllByRole("button", { name: /شاحن سريع/i })[0]);

    const smartButton = await screen.findByRole("button", { name: /^دفع كاش/ });
    fireEvent.click(smartButton);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/sales",
        expect.objectContaining({
          method: "POST"
        })
      );
    });

    const requestInit = fetchSpy.mock.calls.find(([url]) => url === "/api/sales")?.[1];
    const payload = JSON.parse(String(requestInit?.body ?? "{}"));

    expect(payload).toMatchObject({
      items: [
        {
          product_id: "product-1",
          quantity: 1,
          discount_percentage: 0
        }
      ],
      payments: [
        {
          account_id: "account-1",
          amount: 100
        }
      ]
    });
    expect(payload.customer_id).toBeUndefined();
    expect(payload.notes).toBeUndefined();

    await waitFor(() => {
      expect(screen.getByText("تم إتمام البيع بنجاح")).toBeVisible();
    });

    expect(localStorage.getItem("aya.pos.lastPaymentMethod")).toBe("cash");
  }, 30000);

  it("renders stabilized Arabic labels without mojibake in the active POS surface", async () => {
    render(<PosWorkspace maxDiscountPercentage={null} />);

    expect(screen.getByText("المنتجات")).toBeVisible();
    expect(screen.getByText("العميل: ضيف جديد")).toBeVisible();
    expect(await screen.findByText("ابدأ بإضافة منتج")).toBeVisible();
    expect(screen.queryByText(/Ø|Ã|Ù/)).not.toBeInTheDocument();
  });
});
