import {
  createExportPackageSchema,
  importProductsSchema,
  restoreDrillSchema
} from "@/lib/validations/portability";

describe("portability validation", () => {
  it("accepts a valid products export payload", () => {
    const parsed = createExportPackageSchema.safeParse({
      package_type: "json",
      scope: "products",
      filters: {
        active_only: true
      }
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects csv backup packages", () => {
    const parsed = createExportPackageSchema.safeParse({
      package_type: "csv",
      scope: "backup",
      filters: {}
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts a dry-run import payload", () => {
    const parsed = importProductsSchema.safeParse({
      mode: "dry_run",
      source_format: "csv",
      source_content: "name,category,sale_price,cost_price,avg_cost_price,stock_quantity\nCable,accessory,5,2,2,10",
      file_name: "products.csv"
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects commit payloads with an invalid dry-run id", () => {
    const parsed = importProductsSchema.safeParse({
      mode: "commit",
      dry_run_job_id: "not-a-uuid"
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts isolated restore drill payloads only", () => {
    const parsed = restoreDrillSchema.safeParse({
      backup_id: "11111111-1111-4111-8111-111111111111",
      target_env: "isolated-drill",
      idempotency_key: "22222222-2222-4222-8222-222222222222"
    });

    expect(parsed.success).toBe(true);
  });
});
