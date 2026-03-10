import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PosWorkspace } from "@/components/pos/pos-workspace";
import { usePosCartStore } from "@/stores/pos-cart";

const mockUseProducts = vi.fn();
const mockUsePosAccounts = vi.fn();

vi.mock("@/hooks/use-products", () => ({
  useProducts: () => mockUseProducts()
}));

vi.mock("@/hooks/use-pos-accounts", () => ({
  usePosAccounts: () => mockUsePosAccounts()
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
      errorMessage: null,
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
      errorMessage: null,
      refresh: vi.fn()
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("autofocuses the local search input and filters products client-side", async () => {
    render(<PosWorkspace />);

    const searchInput = screen.getByRole("searchbox");

    await waitFor(() => {
      expect(searchInput).toHaveFocus();
    });

    fireEvent.change(searchInput, { target: { value: "شاحن" } });

    await waitFor(() => {
      expect(screen.queryAllByText("شاحن سريع").length).toBeGreaterThan(0);
      expect(screen.queryByText("سماعة بلوتوث")).not.toBeInTheDocument();
    });

    expect(globalThis.fetch).not.toHaveBeenCalled();
  }, 15000);

  it("adds a product to the local cart without triggering a write request", async () => {
    render(<PosWorkspace />);

    const quickAddButton = screen.getAllByRole("button", { name: /شاحن سريع/i })[0];
    fireEvent.click(quickAddButton);

    await waitFor(() => {
      expect(screen.getByText("السلة المحلية")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "حذف شاحن سريع" })).toBeInTheDocument();
    });

    expect(usePosCartStore.getState().items).toHaveLength(1);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  }, 15000);
});
