import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

const mockPush = vi.fn();
let mockPathname = "/pos";
let mobileViewport = true;

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: mockPush
  })
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock("@/components/auth/logout-button", () => ({
  LogoutButton: () => <button type="button">تسجيل الخروج</button>
}));

vi.mock("@/components/ui/status-banner", () => ({
  StatusBanner: ({ message }: { message?: string }) => <div>{message}</div>
}));

const navigation = [
  {
    href: "/pos",
    label: "نقطة البيع",
    description: "مسار البيع",
    icon: "pos",
    group: "daily"
  },
  {
    href: "/products",
    label: "المنتجات",
    description: "المنتجات",
    icon: "products",
    group: "daily"
  },
  {
    href: "/notifications",
    label: "الإشعارات",
    description: "الإشعارات",
    icon: "notifications",
    group: "management"
  }
] as const;

function installMatchMediaMock() {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(max-width: 767px)" ? mobileViewport : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
}

describe("DashboardShell", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockPathname = "/pos";
    mobileViewport = true;
    installMatchMediaMock();
  });

  it("restores focus to the same mobile menu trigger that opened the menu", async () => {
    render(
      <DashboardShell
        accountLabel="مدير الفرع"
        homeHref="/"
        isAuthenticated
        navigation={[...navigation]}
        unreadNotifications={2}
        roleLabel="مدير"
      >
        <div>POS</div>
      </DashboardShell>
    );

    const bottomMenuButton = await screen.findByRole("button", { name: "القائمة" });
    fireEvent.click(bottomMenuButton);

    await screen.findByRole("dialog", { name: "التنقل داخل مساحات التشغيل" });
    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(bottomMenuButton).toHaveFocus();
    });
  }, 15000);

  it("submits topbar search without moving focus to the menu toggle", async () => {
    mockPathname = "/notifications";
    mobileViewport = false;
    installMatchMediaMock();

    render(
      <DashboardShell
        accountLabel="مدير الفرع"
        homeHref="/"
        isAuthenticated
        navigation={[...navigation]}
        unreadNotifications={2}
        roleLabel="مدير"
      >
        <div>Notifications</div>
      </DashboardShell>
    );

    const menuToggle = screen.getByRole("button", { name: "فتح القائمة" });
    const searchToggle = screen.getByRole("button", { name: "بحث" });
    fireEvent.click(searchToggle);

    const searchInput = await screen.findByRole("searchbox");
    fireEvent.change(searchInput, { target: { value: "فاتورة" } });
    fireEvent.submit(searchInput.closest("form") as HTMLFormElement);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/search?q=%D9%81%D8%A7%D8%AA%D9%88%D8%B1%D8%A9");
    });

    expect(menuToggle).not.toHaveFocus();
  }, 15000);
});
