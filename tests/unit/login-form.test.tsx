import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LoginForm } from "@/components/auth/login-form";

const { mockRouterReplace, mockSignInWithPassword, mockSingle } = vi.hoisted(() => ({
  mockRouterReplace: vi.fn(),
  mockSignInWithPassword: vi.fn(),
  mockSingle: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockRouterReplace
  })
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mockSingle
        })
      })
    })
  })
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn()
  }
}));

describe("LoginForm", () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true
    });
    window.localStorage.clear();
    mockRouterReplace.mockReset();
    mockSignInWithPassword.mockReset();
    mockSingle.mockReset();
  });

  it("redirects admins to /reports after successful login", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: "admin-1" }, session: {} },
      error: null
    });
    mockSingle.mockResolvedValue({ data: { role: "admin" } });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("البريد الإلكتروني"), {
      target: { value: "admin@aya.local" }
    });
    fireEvent.change(screen.getByLabelText("كلمة المرور"), {
      target: { value: "password123" }
    });
    fireEvent.click(screen.getByRole("button", { name: /تسجيل الدخول/i }));

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "admin@aya.local",
        password: "password123"
      });
      expect(mockRouterReplace).toHaveBeenCalledWith("/reports");
    });
  }, 15000);

  it("shows a persistent error banner when login fails", async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: "Bad credentials" }
    });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("البريد الإلكتروني"), {
      target: { value: "wrong@aya.local" }
    });
    fireEvent.change(screen.getByLabelText("كلمة المرور"), {
      target: { value: "wrong-password" }
    });
    fireEvent.click(screen.getByRole("button", { name: /تسجيل الدخول/i }));

    expect(await screen.findByText("تعذر تسجيل الدخول")).toBeInTheDocument();
    expect(screen.getByText("تعذر إكمال تسجيل الدخول. حاول مجددًا.")).toBeInTheDocument();
    expect(screen.queryByText("Bad credentials")).not.toBeInTheDocument();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  }, 15000);

  it("redirects pos staff to /pos and falls back to /pos when profile is unavailable", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: "pos-1" }, session: {} },
      error: null
    });
    mockSingle.mockResolvedValueOnce({ data: { role: "pos_staff" } }).mockResolvedValueOnce({ data: null });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("البريد الإلكتروني"), {
      target: { value: "pos@aya.local" }
    });
    fireEvent.change(screen.getByLabelText("كلمة المرور"), {
      target: { value: "password123" }
    });
    fireEvent.click(screen.getByRole("button", { name: /تسجيل الدخول/i }));

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith("/pos");
    });
  }, 15000);

  it("keeps the submit action available when the browser reports offline", async () => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false
    });

    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: "admin-1" }, session: {} },
      error: null
    });
    mockSingle.mockResolvedValue({ data: { role: "admin" } });

    render(<LoginForm />);

    expect(screen.getByText("الاتصال غير متاح")).toBeInTheDocument();

    const submitButton = screen.getByRole("button", { name: /تسجيل الدخول/i });
    expect(submitButton).not.toBeDisabled();

    fireEvent.change(screen.getByLabelText("البريد الإلكتروني"), {
      target: { value: "admin@aya.local" }
    });
    fireEvent.change(screen.getByLabelText("كلمة المرور"), {
      target: { value: "password123" }
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "admin@aya.local",
        password: "password123"
      });
      expect(mockRouterReplace).toHaveBeenCalledWith("/reports");
    });
  }, 15000);

  it("remembers the last successful email when the checkbox stays enabled", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: "admin-1" }, session: {} },
      error: null
    });
    mockSingle.mockResolvedValue({ data: { role: "admin" } });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("البريد الإلكتروني"), {
      target: { value: "admin@aya.local" }
    });
    fireEvent.change(screen.getByLabelText("كلمة المرور"), {
      target: { value: "password123" }
    });
    fireEvent.click(screen.getByRole("button", { name: /تسجيل الدخول/i }));

    await waitFor(() => {
      expect(window.localStorage.getItem("aya.login.email")).toBe("admin@aya.local");
      expect(mockRouterReplace).toHaveBeenCalledWith("/reports");
    });
  }, 15000);
});
