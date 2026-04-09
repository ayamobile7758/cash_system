import React from "react";
import { render, screen } from "@testing-library/react";
import DashboardLoading from "@/app/(dashboard)/loading";

describe("DashboardLoading", () => {
  it("renders a non-blank loading shell with skeleton content", () => {
    const { container } = render(<DashboardLoading />);

    expect(container.querySelector(".dashboard-loading")).toBeTruthy();
    expect(container.querySelector(".dashboard-loading__topbar")).toBeTruthy();
    expect(container.querySelectorAll(".skeleton-line").length).toBeGreaterThanOrEqual(10);
    expect(container.querySelectorAll(".skeleton-card").length).toBe(3);
    expect(screen.getByRole("main", { name: "جارٍ تحميل مساحة العمل" })).toBeInTheDocument();
  }, 20000);
});
