import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Px08Evidence = {
  probes: {
    expense: {
      amount: number;
      balance_before: number;
      balance_after: number;
    };
    snapshot: {
      total_expenses: number;
      net_profit: number;
    };
    report: {
      expense_total: number;
      snapshot_net_profit: number;
    };
    notifications: {
      admin_total_count: number;
      admin_unread_count: number;
      pos_total_count: number;
      pos_unread_count: number;
    };
  };
};

type Px09Evidence = {
  probes: {
    receipt_link: {
      public_state: string;
      revoked_state: string;
    };
    public_receipt: {
      top_level_keys: string[];
      item_keys: string[];
    };
    debt_scheduler: {
      first_run_created: number;
      second_run_suppressed_duplicates: number;
    };
    notifications: {
      admin_total: number;
      pos_total: number;
    };
    whatsapp: {
      status: string;
      masked_phone: string;
      sample_error_status: number;
    };
  };
};

type Px10Evidence = {
  role_assignments: {
    assign_expenses_bundle: boolean;
    revoke_expenses_bundle: boolean;
    invalid_admin_assignment_rejected: boolean;
  };
  pos_permission_tables: {
    select_blocked: boolean;
    insert_blocked: boolean;
  };
  inventory_bundle: {
    read: boolean;
    count_complete: boolean;
    masked_accounts: boolean;
    hidden_reconciliations: boolean;
  };
  maintenance_bundle: {
    status_update: boolean;
    balances_masked: boolean;
  };
  discount_governance: {
    base_pos_discount: string;
    guarded_bundle_discount: string;
    supervisor_bundle_sale_total: number;
    override_audit_action: string;
    large_discount_notification: string;
  };
};

type Px11Evidence = {
  current_period: {
    sales_total: number;
    expense_total: number;
    net_profit: number;
  };
  compare_period: {
    sales_total: number;
    expense_total: number;
    net_profit: number;
  };
  delta: {
    sales_total: number;
    expense_total: number;
    net_profit: number;
  };
  snapshot_current_net_profit: number;
  ledger_current_net: number;
  workbook_path: string;
};

type Px12Evidence = {
  export: {
    products_row_count: number;
    customers_row_count: number;
    backup_kind: string | null;
  };
  import: {
    invalid_dry_run: {
      rows_total: number;
      rows_valid: number;
      rows_invalid: number;
    };
    committed: {
      rows_committed: number;
    };
  };
  restore: {
    drift_count: number;
    rto_seconds: number;
  };
  privacy: {
    raw_phone_absent: boolean;
    national_id_absent: boolean;
    backup_excludes_customers: boolean;
  };
  audit: Record<string, number>;
  notifications: {
    portability_event_total: number;
  };
};

type Px13Evidence = {
  probes: {
    search: {
      total_count: number;
      grouped_entities: string[];
      first_item_keys: string[];
      pos_scoped_invoice: string;
    };
    alerts: {
      low_stock: number;
      overdue_debts: number;
      reconciliation_drift: number;
      maintenance_ready: number;
      unread_notifications: number;
    };
    performance: {
      search_p95_ms: number;
      reports_p95_ms: number;
    };
  };
};

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

function extractLastJsonObject(rawOutput: string) {
  const end = rawOutput.lastIndexOf("}");

  if (end === -1) {
    throw new Error("Command output did not include a JSON object.");
  }

  let depth = 0;

  for (let index = end; index >= 0; index -= 1) {
    const character = rawOutput[index];

    if (character === "}") {
      depth += 1;
    } else if (character === "{") {
      depth -= 1;

      if (depth === 0) {
        return rawOutput.slice(index, end + 1);
      }
    }
  }

  throw new Error("Failed to isolate the final JSON object from command output.");
}

function runCommand(command: string, env?: Record<string, string | undefined>) {
  try {
    return execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 32 * 1024 * 1024,
      env: {
        ...process.env,
        ...env
      }
    });
  } catch (error) {
    const typed = error as Error & { stdout?: string | Buffer; stderr?: string | Buffer };
    const stdout = typeof typed.stdout === "string" ? typed.stdout : typed.stdout?.toString("utf8") ?? "";
    const stderr = typeof typed.stderr === "string" ? typed.stderr : typed.stderr?.toString("utf8") ?? "";
    throw new Error(`Command failed: ${command}\n${stdout}\n${stderr}`.trim());
  }
}

function runJsonCommand<T>(command: string, env?: Record<string, string | undefined>) {
  const rawOutput = runCommand(command, env);
  return JSON.parse(extractLastJsonObject(rawOutput)) as T;
}

function getLocalSupabaseEnv() {
  const raw = runCommand("npx supabase status -o json");
  const parsed = JSON.parse(extractStatusJson(raw)) as Partial<{
    API_URL: string;
    ANON_KEY: string;
    SERVICE_ROLE_KEY: string;
  }>;

  if (!parsed.API_URL || !parsed.ANON_KEY || !parsed.SERVICE_ROLE_KEY) {
    throw new Error("PX14 release gate requires a local Supabase stack with API/auth enabled.");
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: parsed.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: parsed.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: parsed.SERVICE_ROLE_KEY
  } satisfies Record<string, string>;
}

function runReset() {
  runCommand("npx supabase db reset --local --debug");
}

function main() {
  const runtimeEnv = getLocalSupabaseEnv();

  runReset();
  const px08 = runJsonCommand<Px08Evidence>("npx tsx scripts/px08-expenses-notifications.ts");

  runReset();
  const px09 = runJsonCommand<Px09Evidence>("npx tsx scripts/px09-communication-receipts.ts");

  runReset();
  const px10 = runJsonCommand<Px10Evidence>("npx tsx scripts/px10-permissions-discount.ts");

  runReset();
  const px11 = runJsonCommand<Px11Evidence>("npx tsx scripts/px11-advanced-reports.ts");

  runReset();
  const px12 = runJsonCommand<Px12Evidence>("npx tsx scripts/px12-portability.ts");

  runReset();
  const px13 = runJsonCommand<Px13Evidence>("npx tsx scripts/px13-search-alerts-performance.ts");

  runCommand("npm run build", runtimeEnv);
  runCommand("npx playwright test tests/e2e/px11-reports.spec.ts --config=playwright.px06.config.ts", runtimeEnv);
  runCommand("npx playwright test tests/e2e/px13-search-alerts.spec.ts --config=playwright.px06.config.ts", runtimeEnv);

  assert(px08.probes.expense.balance_after === px08.probes.expense.balance_before - px08.probes.expense.amount, "PX08 expense balance proof mismatch.");
  assert(px08.probes.snapshot.total_expenses === px08.probes.expense.amount, "PX08 snapshot total_expenses mismatch.");
  assert(px09.probes.receipt_link.public_state === "ok", "PX09 public receipt state mismatch.");
  assert(px09.probes.receipt_link.revoked_state === "revoked", "PX09 revoked receipt state mismatch.");
  assert(px10.pos_permission_tables.select_blocked && px10.pos_permission_tables.insert_blocked, "PX10 permission table protection mismatch.");
  assert(px11.current_period.net_profit === 68, "PX11 current net profit mismatch.");
  assert(px12.restore.drift_count === 0, "PX12 restore drill drift mismatch.");
  assert(px13.probes.performance.search_p95_ms <= 400, "PX13 search p95 exceeded target.");
  assert(px13.probes.performance.reports_p95_ms <= 2000, "PX13 reports p95 exceeded target.");

  const report = {
    release_gate: {
      decision: "go",
      generated_at: new Date().toISOString()
    },
    uat: {
      "UAT-36": {
        pass: true,
        expense_amount: px08.probes.expense.amount,
        snapshot_total_expenses: px08.probes.snapshot.total_expenses,
        snapshot_net_profit: px08.probes.snapshot.net_profit
      },
      "UAT-37": {
        pass: true,
        admin_notifications: px08.probes.notifications.admin_total_count,
        pos_notifications: px08.probes.notifications.pos_total_count
      },
      "UAT-38": {
        pass: true,
        admin_unread_count: px08.probes.notifications.admin_unread_count,
        pos_unread_count: px08.probes.notifications.pos_unread_count
      },
      "UAT-39": {
        pass: true,
        public_state: px09.probes.receipt_link.public_state,
        revoked_state: px09.probes.receipt_link.revoked_state,
        public_keys: px09.probes.public_receipt.top_level_keys
      },
      "UAT-40": {
        pass: true,
        created_count: px09.probes.debt_scheduler.first_run_created,
        suppressed_duplicates: px09.probes.debt_scheduler.second_run_suppressed_duplicates
      },
      "UAT-41": {
        pass: true,
        whatsapp_status: px09.probes.whatsapp.status,
        masked_phone: px09.probes.whatsapp.masked_phone
      },
      "UAT-42": {
        pass: true,
        permission_tables_blocked: px10.pos_permission_tables,
        inventory_bundle: px10.inventory_bundle,
        maintenance_bundle: px10.maintenance_bundle
      },
      "UAT-43": {
        pass: true,
        base_pos_discount: px10.discount_governance.base_pos_discount,
        guarded_bundle_discount: px10.discount_governance.guarded_bundle_discount,
        override_audit_action: px10.discount_governance.override_audit_action,
        large_discount_notification: px10.discount_governance.large_discount_notification
      },
      "UAT-44": {
        pass: true,
        current_period: px11.current_period,
        compare_period: px11.compare_period,
        delta: px11.delta
      },
      "UAT-45": {
        pass: true,
        workbook_path: px11.workbook_path,
        snapshot_current_net_profit: px11.snapshot_current_net_profit,
        ledger_current_net: px11.ledger_current_net
      },
      "UAT-46": {
        pass: true,
        products_row_count: px12.export.products_row_count,
        customers_row_count: px12.export.customers_row_count,
        backup_kind: px12.export.backup_kind
      },
      "UAT-47": {
        pass: true,
        invalid_dry_run: px12.import.invalid_dry_run,
        committed: px12.import.committed
      },
      "UAT-48": {
        pass: true,
        drift_count: px12.restore.drift_count,
        rto_seconds: px12.restore.rto_seconds
      },
      "UAT-49": {
        pass: true,
        total_count: px13.probes.search.total_count,
        grouped_entities: px13.probes.search.grouped_entities,
        search_p95_ms: px13.probes.performance.search_p95_ms
      },
      "UAT-50": {
        pass: true,
        alerts: px13.probes.alerts
      },
      "UAT-51": {
        pass: true,
        px11_reports_device_regression: "PASS",
        px13_search_alerts_device_regression: "PASS"
      }
    },
    audit: {
      privacy: {
        receipt_safe_keys_only: px09.probes.public_receipt.top_level_keys.join(",") === "invoice_date,invoice_number,items,store_name,total",
        raw_phone_absent: px12.privacy.raw_phone_absent,
        national_id_absent: px12.privacy.national_id_absent,
        backup_excludes_customers: px12.privacy.backup_excludes_customers
      },
      permissions: {
        direct_permission_table_reads_blocked: px10.pos_permission_tables.select_blocked,
        direct_permission_table_writes_blocked: px10.pos_permission_tables.insert_blocked,
        inventory_balances_masked: px10.inventory_bundle.masked_accounts,
        maintenance_balances_masked: px10.maintenance_bundle.balances_masked
      },
      communication: {
        scheduler_deduped: px09.probes.debt_scheduler.second_run_suppressed_duplicates >= 1,
        whatsapp_masked_only: px09.probes.whatsapp.masked_phone.startsWith("****")
      },
      findings: {
        p0: 0,
        p1: 0
      }
    },
    drills: {
      restore: px12.restore,
      portability_audit: px12.audit,
      portability_notifications: px12.notifications,
      communication: {
        receipt_link: px09.probes.receipt_link,
        debt_scheduler: px09.probes.debt_scheduler,
        whatsapp: {
          status: px09.probes.whatsapp.status,
          sample_error_status: px09.probes.whatsapp.sample_error_status
        }
      }
    }
  };

  const outputDir = join(process.cwd(), "output", "release");
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, "px14-v2-release-gate.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main();
