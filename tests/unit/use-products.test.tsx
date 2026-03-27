import { act, renderHook, waitFor } from "@testing-library/react";
import { useProducts } from "@/hooks/use-products";

const mockRange = vi.fn();
const mockSecondOrder = vi.fn(() => ({
  range: mockRange
}));
const mockFirstOrder = vi.fn(() => ({
  order: mockSecondOrder
}));
const mockSelect = vi.fn(() => ({
  order: mockFirstOrder
}));
const mockFrom = vi.fn(() => ({
  select: mockSelect
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    from: mockFrom
  })
}));

describe("useProducts", () => {
  beforeEach(() => {
    mockRange.mockReset();
    mockSecondOrder.mockClear();
    mockFirstOrder.mockClear();
    mockSelect.mockClear();
    mockFrom.mockClear();
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true
    });
  });

  it("loads products in pages and appends the next page on demand", async () => {
    const pages = [
      {
        data: [
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
        error: null,
        count: 3
      },
      {
        data: [
          {
            id: "product-3",
            name: "غطاء حماية",
            category: "accessory",
            sku: "CASE-001",
            description: "Silicone",
            sale_price: 20,
            stock_quantity: 10,
            min_stock_level: 2,
            track_stock: true,
            is_quick_add: false,
            is_active: true,
            created_at: "",
            updated_at: "",
            created_by: "admin-1"
          }
        ],
        error: null,
        count: 3
      }
    ];

    mockRange.mockImplementation(async () => pages.shift() ?? { data: [], error: null, count: 3 });

    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.products).toHaveLength(2);
    expect(result.current.hasMore).toBe(true);
    expect(mockRange).toHaveBeenNthCalledWith(1, 0, 149);

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.products).toHaveLength(3);
    });

    expect(result.current.hasMore).toBe(false);
    expect(mockRange).toHaveBeenNthCalledWith(2, 150, 299);
  });
});
