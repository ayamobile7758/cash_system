import { globalSearchQuerySchema } from "@/lib/validations/search";

describe("globalSearchQuerySchema", () => {
  it("accepts a valid global search query", () => {
    const parsed = globalSearchQuerySchema.safeParse({
      q: "px13",
      entity: "product",
      limit: "12"
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }

    expect(parsed.data.limit).toBe(12);
  });

  it("rejects queries shorter than two characters", () => {
    const parsed = globalSearchQuerySchema.safeParse({
      q: "a"
    });

    expect(parsed.success).toBe(false);
  });

  it("caps limit at 20", () => {
    const parsed = globalSearchQuerySchema.safeParse({
      q: "px13",
      limit: "30"
    });

    expect(parsed.success).toBe(false);
  });
});
