import { advancedReportQuerySchema } from "@/lib/validations/reports";

describe("advanced report query validation", () => {
  it("accepts a valid compare query", () => {
    const result = advancedReportQuerySchema.safeParse({
      from_date: "2026-03-01",
      to_date: "2026-03-31",
      compare_from_date: "2026-02-01",
      compare_to_date: "2026-02-28",
      group_by: "week",
      dimension: "supplier"
    });

    expect(result.success).toBe(true);
  });

  it("rejects partial compare dates", () => {
    const result = advancedReportQuerySchema.safeParse({
      from_date: "2026-03-01",
      to_date: "2026-03-31",
      compare_from_date: "2026-02-01"
    });

    expect(result.success).toBe(false);
  });

  it("rejects reversed current period dates", () => {
    const result = advancedReportQuerySchema.safeParse({
      from_date: "2026-03-31",
      to_date: "2026-03-01"
    });

    expect(result.success).toBe(false);
  });
});
