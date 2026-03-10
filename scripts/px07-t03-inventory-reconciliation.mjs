import { execFileSync, execSync } from "node:child_process";
import { randomUUID } from "node:crypto";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function extractStatusJson(rawOutput) {
  const start = rawOutput.indexOf("{");
  const end = rawOutput.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new Error("Failed to parse `supabase status -o json` output.");
  }

  return rawOutput.slice(start, end + 1);
}

function getLocalDbUrl() {
  const raw = execSync("npx supabase status -o json", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  const parsed = JSON.parse(extractStatusJson(raw));
  if (!parsed.DB_URL) {
    throw new Error("DB_URL is not available from `supabase status -o json`.");
  }

  return parsed.DB_URL;
}

function sqlLiteral(value) {
  if (value == null) {
    return "NULL";
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

function jsonLiteral(value) {
  return `${sqlLiteral(JSON.stringify(value))}::jsonb`;
}

function uuidArrayLiteral(values) {
  if (!values || values.length === 0) {
    return "NULL::uuid[]";
  }

  return `ARRAY[${values.map((value) => `${sqlLiteral(value)}::uuid`).join(", ")}]::uuid[]`;
}

function errorCodeFrom(message) {
  const match = String(message).match(/ERR_[A-Z0-9_]+/);
  return match?.[0] ?? null;
}

function runSql(dbUrl, sql) {
  return execFileSync("psql", [dbUrl, "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1"], {
    input: `${sql.trim()}\n`,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"]
  }).trim();
}

function runJson(dbUrl, sql) {
  const raw = runSql(dbUrl, sql);
  if (!raw) {
    throw new Error("Expected JSON output, received empty response.");
  }

  return JSON.parse(raw);
}

function runRpcJson(dbUrl, fnName, namedArgsSql) {
  return runJson(dbUrl, `SELECT ${fnName}(${namedArgsSql})::text AS json`);
}

function expectSqlError(dbUrl, sql, expectedCode) {
  try {
    runSql(dbUrl, sql);
  } catch (error) {
    const stderr = String(error.stderr ?? error.message);
    const actual = errorCodeFrom(stderr);
    assert(actual === expectedCode, `Expected ${expectedCode}, received ${actual ?? stderr}`);
    return;
  }

  throw new Error(`Expected ${expectedCode}, but SQL succeeded.`);
}

function insertAuthUser(dbUrl, { id, email, fullName, role }) {
  runSql(
    dbUrl,
    `
      INSERT INTO auth.users (
        id,
        aud,
        role,
        email,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
      ) VALUES (
        ${sqlLiteral(id)},
        'authenticated',
        'authenticated',
        ${sqlLiteral(email)},
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        ${jsonLiteral({ full_name: fullName, role })},
        now(),
        now()
      )
    `
  );
}

function toNumber(value) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return Number(value ?? 0);
}

function nowEmail(prefix) {
  return `${prefix}-${Date.now()}@local.test`;
}

function main() {
  const dbUrl = getLocalDbUrl();
  const adminId = randomUUID();
  const posId = randomUUID();

  insertAuthUser(dbUrl, {
    id: adminId,
    email: nowEmail("px07t03-admin"),
    fullName: "PX07T03 Admin",
    role: "admin"
  });

  insertAuthUser(dbUrl, {
    id: posId,
    email: nowEmail("px07t03-pos"),
    fullName: "PX07T03 POS",
    role: "pos_staff"
  });

  const fixtures = runJson(
    dbUrl,
    `
      WITH inserted_products AS (
        INSERT INTO products (
          name,
          category,
          sale_price,
          cost_price,
          avg_cost_price,
          stock_quantity,
          min_stock_level,
          track_stock,
          is_quick_add,
          created_by
        ) VALUES
          (
            ${sqlLiteral(`PX07 Count Product A ${Date.now()}`)},
            'accessory',
            30,
            10,
            10,
            10,
            1,
            true,
            false,
            ${sqlLiteral(adminId)}
          ),
          (
            ${sqlLiteral(`PX07 Count Product B ${Date.now()}`)},
            'accessory',
            18,
            7,
            7,
            4,
            1,
            true,
            false,
            ${sqlLiteral(adminId)}
          )
        RETURNING id, name, stock_quantity
      ),
      cash_account AS (
        SELECT id, name, current_balance
        FROM accounts
        WHERE type = 'cash'
          AND module_scope = 'core'
        LIMIT 1
      )
      SELECT json_build_object(
        'products', (SELECT json_agg(row_to_json(inserted_products)) FROM inserted_products),
        'cash_account', (SELECT row_to_json(cash_account) FROM cash_account)
      )::text AS json
    `
  );

  const activeProducts = runJson(
    dbUrl,
    `
      SELECT json_build_object(
        'count', COUNT(*)::int
      )::text AS json
      FROM products
      WHERE is_active = true
    `
  );

  const [productA, productB] = fixtures.products;
  const cashAccount = fixtures.cash_account;
  const results = {
    fixtures: {
      admin_id: adminId,
      pos_id: posId,
      product_a_id: productA.id,
      product_b_id: productB.id,
      cash_account_id: cashAccount.id,
      active_product_count: activeProducts.count
    },
    probes: {}
  };

  const selectedCount = runRpcJson(
    dbUrl,
    "start_inventory_count",
    [
      `p_count_type => 'daily'::inventory_count_type`,
      `p_product_ids => ${uuidArrayLiteral([productA.id])}`,
      `p_notes => ${sqlLiteral("PX07 T03 selected count")}`,
      `p_created_by => ${sqlLiteral(adminId)}`
    ].join(", ")
  );

  const selectedState = runJson(
    dbUrl,
    `
      SELECT json_build_object(
        'count', (
          SELECT row_to_json(count_row)
          FROM (
            SELECT id, count_type, status, notes
            FROM inventory_counts
            WHERE id = ${sqlLiteral(selectedCount.count_id)}
          ) count_row
        ),
        'items', (
          SELECT json_agg(row_to_json(item_row))
          FROM (
            SELECT id, product_id, system_quantity, actual_quantity, difference, reason
            FROM inventory_count_items
            WHERE inventory_count_id = ${sqlLiteral(selectedCount.count_id)}
            ORDER BY product_id ASC
          ) item_row
        )
      )::text AS json
    `
  );

  const selectedItem = selectedState.items[0];
  assert(selectedCount.item_count === 1, "Selected count should include exactly one product.");
  assert(selectedState.count.status === "in_progress", "Selected count should start in progress.");
  assert(selectedItem.product_id === productA.id, "Selected count should target product A only.");
  assert(toNumber(selectedItem.system_quantity) === 10, "Selected count system quantity mismatch.");

  const selectedCompletion = runRpcJson(
    dbUrl,
    "complete_inventory_count",
    [
      `p_inventory_count_id => ${sqlLiteral(selectedCount.count_id)}`,
      `p_items => ${jsonLiteral([
        {
          inventory_count_item_id: selectedItem.id,
          actual_quantity: 7,
          reason: "broken-packaging"
        }
      ])}`,
      `p_created_by => ${sqlLiteral(adminId)}`
    ].join(", ")
  );

  const selectedAfter = runJson(
    dbUrl,
    `
      SELECT json_build_object(
        'item', (
          SELECT row_to_json(item_row)
          FROM (
            SELECT actual_quantity, difference, reason
            FROM inventory_count_items
            WHERE id = ${sqlLiteral(selectedItem.id)}
          ) item_row
        ),
        'count', (
          SELECT row_to_json(count_row)
          FROM (
            SELECT status, completed_at
            FROM inventory_counts
            WHERE id = ${sqlLiteral(selectedCount.count_id)}
          ) count_row
        ),
        'product', (
          SELECT row_to_json(product_row)
          FROM (
            SELECT stock_quantity
            FROM products
            WHERE id = ${sqlLiteral(productA.id)}
          ) product_row
        ),
        'audit', (
          SELECT row_to_json(audit_row)
          FROM (
            SELECT action_type
            FROM audit_logs
            WHERE record_id = ${sqlLiteral(selectedCount.count_id)}
              AND action_type = 'complete_inventory_count'
            ORDER BY action_timestamp DESC
            LIMIT 1
          ) audit_row
        )
      )::text AS json
    `
  );

  assert(selectedCompletion.adjusted_products === 1, "Selected completion should adjust one product.");
  assert(selectedCompletion.total_difference === 3, "Selected completion total difference mismatch.");
  assert(toNumber(selectedAfter.item.actual_quantity) === 7, "Selected completion actual quantity mismatch.");
  assert(toNumber(selectedAfter.item.difference) === -3, "Selected completion difference mismatch.");
  assert(selectedAfter.item.reason === "broken-packaging", "Selected completion reason mismatch.");
  assert(toNumber(selectedAfter.product.stock_quantity) === 7, "Product A stock was not updated.");
  assert(selectedAfter.count.status === "completed", "Selected count should be completed.");
  assert(Boolean(selectedAfter.count.completed_at), "Selected count should have completed_at.");
  assert(selectedAfter.audit.action_type === "complete_inventory_count", "Selected count audit log missing.");

  results.probes.selected_count = {
    count_id: selectedCount.count_id,
    count_type: selectedCount.count_type,
    item_count: selectedCount.item_count,
    adjusted_products: selectedCompletion.adjusted_products,
    total_difference: selectedCompletion.total_difference,
    product_a_stock_after: toNumber(selectedAfter.product.stock_quantity)
  };

  const fullCount = runRpcJson(
    dbUrl,
    "start_inventory_count",
    [
      `p_count_type => 'monthly'::inventory_count_type`,
      `p_product_ids => NULL::uuid[]`,
      `p_notes => ${sqlLiteral("PX07 T03 full count")}`,
      `p_created_by => ${sqlLiteral(adminId)}`
    ].join(", ")
  );

  const fullCountItems = runJson(
    dbUrl,
    `
      SELECT COALESCE(json_agg(row_to_json(item_row)), '[]'::json)::text AS json
      FROM (
        SELECT id, product_id, system_quantity, actual_quantity
        FROM inventory_count_items
        WHERE inventory_count_id = ${sqlLiteral(fullCount.count_id)}
        ORDER BY product_id ASC
      ) item_row
    `
  );

  assert(
    toNumber(fullCount.item_count) === toNumber(activeProducts.count),
    "Full count should include all active products."
  );

  const fullItemA = fullCountItems.find((item) => item.product_id === productA.id);
  const fullItemB = fullCountItems.find((item) => item.product_id === productB.id);

  assert(Boolean(fullItemA), "Full count should include product A.");
  assert(Boolean(fullItemB), "Full count should include product B.");

  const fullCompletion = runRpcJson(
    dbUrl,
    "complete_inventory_count",
    [
      `p_inventory_count_id => ${sqlLiteral(fullCount.count_id)}`,
      `p_items => ${jsonLiteral(
        fullCountItems.map((item) => ({
          inventory_count_item_id: item.id,
          actual_quantity: item.product_id === productB.id ? 6 : toNumber(item.system_quantity),
          reason: item.product_id === productB.id ? "manual-return-correction" : undefined
        }))
      )}`,
      `p_created_by => ${sqlLiteral(adminId)}`
    ].join(", ")
  );

  const fullAfter = runJson(
    dbUrl,
    `
      SELECT json_build_object(
        'item_b', (
          SELECT row_to_json(item_row)
          FROM (
            SELECT actual_quantity, difference, reason
            FROM inventory_count_items
            WHERE id = ${sqlLiteral(fullItemB.id)}
          ) item_row
        ),
        'product_b', (
          SELECT row_to_json(product_row)
          FROM (
            SELECT stock_quantity
            FROM products
            WHERE id = ${sqlLiteral(productB.id)}
          ) product_row
        )
      )::text AS json
    `
  );

  assert(fullCompletion.adjusted_products === 1, "Full completion should adjust one product.");
  assert(fullCompletion.total_difference === 2, "Full completion total difference mismatch.");
  assert(toNumber(fullAfter.item_b.actual_quantity) === 6, "Full completion actual quantity mismatch.");
  assert(toNumber(fullAfter.item_b.difference) === 2, "Full completion difference mismatch.");
  assert(fullAfter.item_b.reason === "manual-return-correction", "Full completion reason mismatch.");
  assert(toNumber(fullAfter.product_b.stock_quantity) === 6, "Product B stock was not updated.");

  results.probes.full_count = {
    count_id: fullCount.count_id,
    count_type: fullCount.count_type,
    item_count: fullCount.item_count,
    adjusted_products: fullCompletion.adjusted_products,
    total_difference: fullCompletion.total_difference,
    product_b_stock_after: toNumber(fullAfter.product_b.stock_quantity)
  };

  const reconciliation = runRpcJson(
    dbUrl,
    "reconcile_account",
    [
      `p_account_id => ${sqlLiteral(cashAccount.id)}`,
      `p_actual_balance => 15`,
      `p_notes => ${sqlLiteral("cash-difference-detected")}`,
      `p_created_by => ${sqlLiteral(adminId)}`
    ].join(", ")
  );

  const reconciliationAfter = runJson(
    dbUrl,
    `
      SELECT json_build_object(
        'entry', (
          SELECT row_to_json(recon_row)
          FROM (
            SELECT expected_balance, actual_balance, difference, difference_reason, is_resolved
            FROM reconciliation_entries
            WHERE id = ${sqlLiteral(reconciliation.reconciliation_id)}
          ) recon_row
        ),
        'ledger', (
          SELECT row_to_json(ledger_row)
          FROM (
            SELECT amount, adjustment_direction, reference_type, reference_id
            FROM ledger_entries
            WHERE reference_type = 'reconciliation'
              AND reference_id = ${sqlLiteral(reconciliation.reconciliation_id)}
            LIMIT 1
          ) ledger_row
        ),
        'notification', (
          SELECT row_to_json(notification_row)
          FROM (
            SELECT type, reference_type
            FROM notifications
            WHERE type = 'reconciliation_difference'
              AND reference_id = ${sqlLiteral(cashAccount.id)}
            ORDER BY created_at DESC
            LIMIT 1
          ) notification_row
        ),
        'account', (
          SELECT row_to_json(account_row)
          FROM (
            SELECT current_balance
            FROM accounts
            WHERE id = ${sqlLiteral(cashAccount.id)}
          ) account_row
        )
      )::text AS json
    `
  );

  assert(toNumber(reconciliation.expected) === 0, "Reconciliation expected balance mismatch.");
  assert(toNumber(reconciliation.actual) === 15, "Reconciliation actual balance mismatch.");
  assert(toNumber(reconciliation.difference) === 15, "Reconciliation difference mismatch.");
  assert(toNumber(reconciliationAfter.entry.expected_balance) === 0, "Stored expected balance mismatch.");
  assert(toNumber(reconciliationAfter.entry.actual_balance) === 15, "Stored actual balance mismatch.");
  assert(toNumber(reconciliationAfter.entry.difference) === 15, "Stored difference mismatch.");
  assert(reconciliationAfter.entry.difference_reason === "cash-difference-detected", "Difference reason mismatch.");
  assert(reconciliationAfter.entry.is_resolved === false, "Reconciliation with difference should remain unresolved.");
  assert(toNumber(reconciliationAfter.ledger.amount) === 15, "Reconciliation ledger amount mismatch.");
  assert(reconciliationAfter.ledger.adjustment_direction === "increase", "Reconciliation ledger direction mismatch.");
  assert(reconciliationAfter.notification.type === "reconciliation_difference", "Reconciliation notification missing.");
  assert(toNumber(reconciliationAfter.account.current_balance) === 15, "Cash balance was not reconciled.");

  results.probes.reconciliation = {
    reconciliation_id: reconciliation.reconciliation_id,
    expected: toNumber(reconciliation.expected),
    actual: toNumber(reconciliation.actual),
    difference: toNumber(reconciliation.difference),
    cash_balance_after: toNumber(reconciliationAfter.account.current_balance),
    ledger_direction: reconciliationAfter.ledger.adjustment_direction
  };

  expectSqlError(
    dbUrl,
    `
      SELECT start_inventory_count(
        p_count_type => 'daily'::inventory_count_type,
        p_product_ids => ${uuidArrayLiteral([productA.id])},
        p_notes => ${sqlLiteral("PX07 T03 unauthorized count")},
        p_created_by => ${sqlLiteral(posId)}
      )
    `,
    "ERR_UNAUTHORIZED"
  );

  expectSqlError(
    dbUrl,
    `
      SELECT complete_inventory_count(
        p_inventory_count_id => ${sqlLiteral(selectedCount.count_id)},
        p_items => ${jsonLiteral([{ inventory_count_item_id: selectedItem.id, actual_quantity: 7 }])},
        p_created_by => ${sqlLiteral(adminId)}
      )
    `,
    "ERR_COUNT_ALREADY_COMPLETED"
  );

  expectSqlError(
    dbUrl,
    `
      SELECT reconcile_account(
        p_account_id => ${sqlLiteral(cashAccount.id)},
        p_actual_balance => 16,
        p_notes => ${sqlLiteral("PX07 T03 unresolved follow-up")},
        p_created_by => ${sqlLiteral(adminId)}
      )
    `,
    "ERR_RECONCILIATION_UNRESOLVED"
  );

  results.probes.expected_failures = {
    unauthorized_start_count: "ERR_UNAUTHORIZED",
    count_already_completed: "ERR_COUNT_ALREADY_COMPLETED",
    reconciliation_unresolved: "ERR_RECONCILIATION_UNRESOLVED"
  };

  console.log(JSON.stringify(results, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
