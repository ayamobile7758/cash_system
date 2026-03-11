import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  createExportPackage,
  revokeExportPackage,
  runProductImportDryRun,
  commitProductImportJob,
  runRestoreDrill,
  type BackupPackageContent
} from "@/lib/api/portability";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function extractStatusJson(rawOutput: string) {
  const start = rawOutput.indexOf("{");
  const end = rawOutput.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new Error("Failed to parse `supabase status -o json` output.");
  }

  return rawOutput.slice(start, end + 1);
}

function getLocalSupabaseEnv() {
  const raw = execSync("npx supabase status -o json", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  const parsed = JSON.parse(extractStatusJson(raw)) as Partial<{
    API_URL: string;
    SERVICE_ROLE_KEY: string;
  }>;

  if (!parsed.API_URL || !parsed.SERVICE_ROLE_KEY) {
    throw new Error(
      "PX12 portability proof requires a local Supabase stack with API/auth enabled. Start local services with kong/auth/rest before running the script."
    );
  }

  return {
    API_URL: parsed.API_URL,
    SERVICE_ROLE_KEY: parsed.SERVICE_ROLE_KEY
  };
}

function nowEmail(prefix: string) {
  return `${prefix}-${Date.now()}@local.test`;
}

function uniquePhone(seed: number) {
  const suffix = String(seed % 100000000).padStart(8, "0");
  return `07${suffix}`;
}

async function maybeSingleOrThrow<T>(
  query: PromiseLike<{ data: T | null; error: { message: string } | null }>,
  label: string
) {
  const { data, error } = await query;

  if (error || !data) {
    throw new Error(`${label}: ${error?.message ?? "record not found"}`);
  }

  return data;
}

async function manyOrThrow<T>(
  query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  label: string
) {
  const { data, error } = await query;

  if (error || !data) {
    throw new Error(`${label}: ${error?.message ?? "records not found"}`);
  }

  return data;
}

async function createAdminUser(supabase: any) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: nowEmail("px12-admin"),
    password: "LocalPass123!",
    email_confirm: true,
    user_metadata: {
      full_name: "PX12 Admin",
      role: "admin"
    }
  });

  if (error || !data.user) {
    throw new Error(`Failed to create admin user: ${error?.message ?? "unknown error"}`);
  }

  return data.user.id;
}

async function createCustomerFixture(supabase: any, adminId: string, seed: number) {
  return maybeSingleOrThrow<{ id: string; name: string; phone: string; national_id: string }>(
    supabase
      .from("debt_customers")
      .insert({
        name: `PX12 Customer ${seed}`,
        phone: uniquePhone(seed),
        national_id: `ID-${seed}`,
        current_balance: 0,
        credit_limit: 100,
        due_date_days: 30,
        created_by: adminId
      })
      .select("id, name, phone, national_id")
      .maybeSingle(),
    "Customer fixture create failed"
  );
}

async function createProductFixture(supabase: any, adminId: string, seed: number) {
  return maybeSingleOrThrow<{ id: string; name: string }>(
    supabase
      .from("products")
      .insert({
        name: `PX12 Product ${seed}`,
        category: "accessory",
        sale_price: 15,
        cost_price: 7,
        avg_cost_price: 7,
        stock_quantity: 12,
        min_stock_level: 2,
        track_stock: true,
        is_quick_add: false,
        created_by: adminId
      })
      .select("id, name")
      .maybeSingle(),
    "Product fixture create failed"
  );
}

async function main() {
  const env = getLocalSupabaseEnv();
  const supabase: any = createClient(env.API_URL, env.SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const seed = Date.now();
  const adminId = await createAdminUser(supabase);
  const productFixture = await createProductFixture(supabase, adminId, seed);
  const customerFixture = await createCustomerFixture(supabase, adminId, seed);

  const productsExport = await createExportPackage(supabase, adminId, {
    package_type: "csv",
    scope: "products",
    filters: { active_only: true }
  });
  const productsPackage = await maybeSingleOrThrow<{
    id: string;
    file_name: string;
    row_count: number;
    content_text: string;
    status: string;
    scope: string;
    package_type: string;
  }>(
    supabase
      .from("export_packages")
      .select("id, file_name, row_count, content_text, status, scope, package_type")
      .eq("id", productsExport.package_id)
      .maybeSingle(),
    "Products export package missing"
  );

  assert(productsPackage.status === "ready", "Products export package should be ready.");
  assert(productsPackage.package_type === "csv", "Products export package should be csv.");
  assert(productsPackage.row_count >= 1, "Products export package should contain at least one row.");
  assert(
    productsPackage.content_text.includes(productFixture.name),
    "Products export content should include the fixture product."
  );

  const customersExport = await createExportPackage(supabase, adminId, {
    package_type: "json",
    scope: "customers",
    filters: { active_only: true }
  });
  const customersPackage = await maybeSingleOrThrow<{
    id: string;
    content_json: {
      scope: string;
      generated_at: string;
      items: Array<Record<string, unknown>>;
    } | null;
    row_count: number;
  }>(
    supabase
      .from("export_packages")
      .select("id, content_json, row_count")
      .eq("id", customersExport.package_id)
      .maybeSingle(),
    "Customers export package missing"
  );

  const exportedCustomer = customersPackage.content_json?.items.find(
    (item) => item.id === customerFixture.id
  ) as Record<string, unknown> | undefined;
  assert(exportedCustomer, "Customer export should include the created customer.");
  assert("phone_masked" in exportedCustomer, "Customer export should contain only masked phone.");
  assert(!("phone" in exportedCustomer), "Customer export must not contain raw phone.");
  assert(!("national_id" in exportedCustomer), "Customer export must not contain national_id.");
  assert(
    String(exportedCustomer["phone_masked"]).endsWith(customerFixture.phone.slice(-4)),
    "Masked phone should preserve only the last digits."
  );

  const invalidDryRun = await runProductImportDryRun(supabase, adminId, {
    source_format: "csv",
    file_name: "px12-products-invalid.csv",
    source_content: [
      "name,category,sale_price,cost_price,avg_cost_price,stock_quantity,min_stock_level,track_stock,is_quick_add,is_active",
      `${productFixture.name},accessory,20,10,10,5,1,true,false,true`,
      `PX12 Imported Valid ${seed},accessory,30,12,12,4,1,true,false,true`
    ].join("\n")
  });

  assert(invalidDryRun.rows_total === 2, "Invalid dry-run should scan both rows.");
  assert(invalidDryRun.rows_valid === 1, "Invalid dry-run should leave one valid row.");
  assert(invalidDryRun.rows_invalid === 1, "Invalid dry-run should report one invalid row.");

  const validDryRun = await runProductImportDryRun(supabase, adminId, {
    source_format: "csv",
    file_name: "px12-products-valid.csv",
    source_content: [
      "name,category,sale_price,cost_price,avg_cost_price,stock_quantity,min_stock_level,track_stock,is_quick_add,is_active",
      `PX12 Imported Commit ${seed},accessory,25,11,11,6,1,true,false,true`
    ].join("\n")
  });

  assert(validDryRun.rows_total === 1, "Valid dry-run should scan one row.");
  assert(validDryRun.rows_valid === 1, "Valid dry-run should accept one row.");
  assert(validDryRun.rows_invalid === 0, "Valid dry-run should not report invalid rows.");

  const committedImport = await commitProductImportJob(supabase, adminId, validDryRun.job_id);
  assert(committedImport.rows_committed === 1, "Commit should insert one product row.");

  const committedProduct = await maybeSingleOrThrow<{ id: string; name: string }>(
    supabase
      .from("products")
      .select("id, name")
      .eq("name", `PX12 Imported Commit ${seed}`)
      .maybeSingle(),
    "Committed import product missing"
  );

  const backupExport = await createExportPackage(supabase, adminId, {
    package_type: "json",
    scope: "backup",
    filters: {}
  });
  const backupPackage = await maybeSingleOrThrow<{ id: string; content_json: BackupPackageContent | null }>(
    supabase
      .from("export_packages")
      .select("id, content_json")
      .eq("id", backupExport.package_id)
      .maybeSingle(),
    "Backup export package missing"
  );

  assert(backupPackage.content_json?.kind === "backup_bundle", "Backup package should be a backup_bundle.");
  assert(
    !("customers" in (backupPackage.content_json as Record<string, unknown>)),
    "Backup package should not include debt_customers raw data."
  );

  const restoreResult = await runRestoreDrill(supabase, adminId, {
    backup_id: backupExport.package_id,
    target_env: "isolated-drill",
    idempotency_key: randomUUID()
  });
  assert(restoreResult.status === "completed", "Restore drill should finish synchronously.");
  assert(restoreResult.drift_count === 0, "Restore drill should finish with drift = 0.");
  assert(restoreResult.rto_seconds >= 1, "Restore drill should record a positive RTO.");

  const restoreRow = await maybeSingleOrThrow<{
    status: string;
    drift_count: number;
    rto_seconds: number;
    result_summary: Record<string, unknown>;
  }>(
    supabase
      .from("restore_drills")
      .select("status, drift_count, rto_seconds, result_summary")
      .eq("id", restoreResult.drill_id)
      .maybeSingle(),
    "Restore drill row missing"
  );

  assert(restoreRow.status === "completed", "Restore drill row should be completed.");
  assert(restoreRow.drift_count === 0, "Restore drill row should persist zero drift.");

  const revokedPackage = await revokeExportPackage(supabase, adminId, customersExport.package_id);
  assert(revokedPackage.status === "revoked", "Customer export package should be revocable.");

  const auditRows = await manyOrThrow<{ action_type: string }>(
    supabase
      .from("audit_logs")
      .select("action_type")
      .eq("user_id", adminId)
      .in("action_type", [
        "create_export_package",
        "revoke_export_package",
        "import_products_dry_run",
        "import_products_commit",
        "restore_drill"
      ])
      .then(({ data, error }: { data: unknown; error: unknown }) => ({
        data: data as Array<{ action_type: string }> | null,
        error: error as { message: string } | null
      })),
    "Expected portability audit rows missing"
  );

  const auditActionCounts = auditRows.reduce<Record<string, number>>((counts, row) => {
    counts[row.action_type] = (counts[row.action_type] ?? 0) + 1;
    return counts;
  }, {});

  assert(auditActionCounts.create_export_package >= 3, "Expected at least three export audit rows.");
  assert(auditActionCounts.revoke_export_package >= 1, "Expected a revoke export audit row.");
  assert(auditActionCounts.import_products_dry_run >= 2, "Expected two import dry-run audit rows.");
  assert(auditActionCounts.import_products_commit >= 1, "Expected an import commit audit row.");
  assert(auditActionCounts.restore_drill >= 1, "Expected a restore drill audit row.");

  const portabilityNotifications = await manyOrThrow<{ type: string; title: string; reference_type: string | null }>(
    supabase
      .from("notifications")
      .select("type, title, reference_type")
      .eq("type", "portability_event")
      .then(({ data, error }: { data: unknown; error: unknown }) => ({
        data: data as Array<{ type: string; title: string; reference_type: string | null }> | null,
        error: error as { message: string } | null
      })),
    "Portability notifications missing"
  );

  assert(
    portabilityNotifications.some((row) => row.reference_type === "export_package"),
    "Expected export_package notifications."
  );
  assert(
    portabilityNotifications.some((row) => row.reference_type === "import_job"),
    "Expected import_job notifications."
  );
  assert(
    portabilityNotifications.some((row) => row.reference_type === "restore_drill"),
    "Expected restore_drill notifications."
  );

  const output = {
    export: {
      products_row_count: productsPackage.row_count,
      customers_row_count: customersPackage.row_count,
      backup_kind: backupPackage.content_json?.kind ?? null,
      revoked_package_id: revokedPackage.package_id
    },
    import: {
      invalid_dry_run: {
        rows_total: invalidDryRun.rows_total,
        rows_valid: invalidDryRun.rows_valid,
        rows_invalid: invalidDryRun.rows_invalid
      },
      committed: {
        rows_committed: committedImport.rows_committed,
        product_name: committedProduct.name
      }
    },
    restore: {
      drill_id: restoreResult.drill_id,
      drift_count: restoreResult.drift_count,
      rto_seconds: restoreResult.rto_seconds
    },
    privacy: {
      customer_phone_masked: String(exportedCustomer["phone_masked"]),
      raw_phone_absent: !("phone" in exportedCustomer),
      national_id_absent: !("national_id" in exportedCustomer),
      backup_excludes_customers: !("customers" in (backupPackage.content_json as Record<string, unknown>))
    },
    audit: auditActionCounts,
    notifications: {
      portability_event_total: portabilityNotifications.length
    }
  };

  const outputDir = join(process.cwd(), "output", "portability");
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, "px12-portability-proof.json"), JSON.stringify(output, null, 2));
  console.log(JSON.stringify(output, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
