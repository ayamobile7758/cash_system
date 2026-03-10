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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function nowEmail(prefix) {
  return `${prefix}-${Date.now()}@local.test`;
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

async function waitForDb(dbUrl) {
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      runSql(dbUrl, "SELECT 1");
      return;
    } catch (error) {
      if (attempt === 20) {
        throw error;
      }

      await sleep(1000);
    }
  }
}

async function main() {
  const dbUrl = getLocalDbUrl();
  await waitForDb(dbUrl);
  const adminId = randomUUID();
  const posId = randomUUID();

  insertAuthUser(dbUrl, {
    id: adminId,
    email: nowEmail("px07t04-admin"),
    fullName: "PX07T04 Admin",
    role: "admin"
  });

  insertAuthUser(dbUrl, {
    id: posId,
    email: nowEmail("px07t04-pos"),
    fullName: "PX07T04 POS",
    role: "pos_staff"
  });

  const fixtures = runJson(
    dbUrl,
    `
      SELECT json_build_object(
        'maintenance_account', (
          SELECT row_to_json(account_row)
          FROM (
            SELECT id, name, current_balance
            FROM accounts
            WHERE module_scope = 'maintenance'
              AND type = 'cash'
              AND is_active = true
            ORDER BY display_order ASC
            LIMIT 1
          ) account_row
        )
      )::text AS json
    `
  );

  const maintenanceAccount = fixtures.maintenance_account;
  assert(Boolean(maintenanceAccount?.id), "Maintenance cash account fixture is missing.");

  const createKey = randomUUID();
  const createdJob = runRpcJson(
    dbUrl,
    "create_maintenance_job",
    [
      `p_customer_name => ${sqlLiteral("محمد الصيانة")}`,
      `p_customer_phone => ${sqlLiteral("0791234567")}`,
      `p_device_type => ${sqlLiteral("Samsung S24")}`,
      `p_issue_description => ${sqlLiteral("تبديل شاشة")}`,
      `p_estimated_cost => 35`,
      `p_notes => ${sqlLiteral("PX07 T04 create")}`,
      `p_idempotency_key => ${sqlLiteral(createKey)}`,
      `p_created_by => ${sqlLiteral(posId)}`
    ].join(", ")
  );

  const createdState = runJson(
    dbUrl,
    `
      SELECT json_build_object(
        'job', (
          SELECT row_to_json(job_row)
          FROM (
            SELECT status, estimated_cost, final_amount, payment_account_id
            FROM maintenance_jobs
            WHERE id = ${sqlLiteral(createdJob.job_id)}
          ) job_row
        ),
        'audit', (
          SELECT row_to_json(audit_row)
          FROM (
            SELECT action_type
            FROM audit_logs
            WHERE record_id = ${sqlLiteral(createdJob.job_id)}
              AND action_type = 'create_maintenance_job'
            ORDER BY action_timestamp DESC
            LIMIT 1
          ) audit_row
        )
      )::text AS json
    `
  );

  assert(createdJob.status === "new", "Maintenance job should start as new.");
  assert(createdState.job.status === "new", "Stored maintenance status mismatch after create.");
  assert(toNumber(createdState.job.estimated_cost) === 35, "Estimated cost mismatch after create.");
  assert(createdState.audit.action_type === "create_maintenance_job", "Create maintenance audit log missing.");

  expectSqlError(
    dbUrl,
    `
      SELECT create_maintenance_job(
        p_customer_name => ${sqlLiteral("محمد الصيانة")},
        p_customer_phone => ${sqlLiteral("0791234567")},
        p_device_type => ${sqlLiteral("Samsung S24")},
        p_issue_description => ${sqlLiteral("تبديل شاشة")},
        p_estimated_cost => 35,
        p_notes => ${sqlLiteral("PX07 T04 duplicate")},
        p_idempotency_key => ${sqlLiteral(createKey)},
        p_created_by => ${sqlLiteral(posId)}
      )
    `,
    "ERR_IDEMPOTENCY"
  );

  const inProgress = runRpcJson(
    dbUrl,
    "update_maintenance_job_status",
    [
      `p_job_id => ${sqlLiteral(createdJob.job_id)}`,
      `p_new_status => 'in_progress'::maintenance_status`,
      `p_notes => ${sqlLiteral("بدء التنفيذ")}`,
      `p_created_by => ${sqlLiteral(posId)}`
    ].join(", ")
  );

  assert(inProgress.status === "in_progress", "Maintenance job should move to in_progress.");

  expectSqlError(
    dbUrl,
    `
      SELECT update_maintenance_job_status(
        p_job_id => ${sqlLiteral(createdJob.job_id)},
        p_new_status => 'delivered'::maintenance_status,
        p_final_amount => 25,
        p_payment_account_id => ${sqlLiteral(maintenanceAccount.id)},
        p_notes => ${sqlLiteral("قفز غير صالح")},
        p_created_by => ${sqlLiteral(posId)}
      )
    `,
    "ERR_MAINTENANCE_INVALID_STATUS"
  );

  const ready = runRpcJson(
    dbUrl,
    "update_maintenance_job_status",
    [
      `p_job_id => ${sqlLiteral(createdJob.job_id)}`,
      `p_new_status => 'ready'::maintenance_status`,
      `p_notes => ${sqlLiteral("جاهز للتسليم")}`,
      `p_created_by => ${sqlLiteral(posId)}`
    ].join(", ")
  );

  const readyState = runJson(
    dbUrl,
    `
      SELECT json_build_object(
        'job', (
          SELECT row_to_json(job_row)
          FROM (
            SELECT status
            FROM maintenance_jobs
            WHERE id = ${sqlLiteral(createdJob.job_id)}
          ) job_row
        ),
        'notification_count', (
          SELECT COUNT(*)::int
          FROM notifications
          WHERE reference_type = 'maintenance_job'
            AND reference_id = ${sqlLiteral(createdJob.job_id)}
            AND type = 'maintenance_ready'
        )
      )::text AS json
    `
  );

  assert(ready.status === "ready", "Maintenance job should move to ready.");
  assert(readyState.job.status === "ready", "Stored maintenance status mismatch after ready.");
  assert(toNumber(readyState.notification_count) >= 2, "Ready notification should be sent to active Admin/POS users.");

  const balanceBeforeDelivery = toNumber(maintenanceAccount.current_balance);
  const delivered = runRpcJson(
    dbUrl,
    "update_maintenance_job_status",
    [
      `p_job_id => ${sqlLiteral(createdJob.job_id)}`,
      `p_new_status => 'delivered'::maintenance_status`,
      `p_final_amount => 40`,
      `p_payment_account_id => ${sqlLiteral(maintenanceAccount.id)}`,
      `p_notes => ${sqlLiteral("تم التسليم والتحصيل")}`,
      `p_created_by => ${sqlLiteral(posId)}`
    ].join(", ")
  );

  const deliveredState = runJson(
    dbUrl,
    `
      SELECT json_build_object(
        'job', (
          SELECT row_to_json(job_row)
          FROM (
            SELECT status, final_amount, payment_account_id, delivered_at
            FROM maintenance_jobs
            WHERE id = ${sqlLiteral(createdJob.job_id)}
          ) job_row
        ),
        'account', (
          SELECT row_to_json(account_row)
          FROM (
            SELECT current_balance
            FROM accounts
            WHERE id = ${sqlLiteral(maintenanceAccount.id)}
          ) account_row
        ),
        'ledger', (
          SELECT row_to_json(ledger_row)
          FROM (
            SELECT amount, entry_type, reference_type, reference_id
            FROM ledger_entries
            WHERE reference_type = 'maintenance_job'
              AND reference_id = ${sqlLiteral(createdJob.job_id)}
            ORDER BY created_at DESC
            LIMIT 1
          ) ledger_row
        ),
        'audit', (
          SELECT row_to_json(audit_row)
          FROM (
            SELECT action_type
            FROM audit_logs
            WHERE record_id = ${sqlLiteral(createdJob.job_id)}
              AND action_type = 'update_maintenance_status'
            ORDER BY action_timestamp DESC
            LIMIT 1
          ) audit_row
        )
      )::text AS json
    `
  );

  assert(delivered.status === "delivered", "Maintenance job should move to delivered.");
  assert(Boolean(delivered.ledger_entry_id), "Delivered maintenance should create a ledger entry.");
  assert(deliveredState.job.status === "delivered", "Stored maintenance status mismatch after delivery.");
  assert(toNumber(deliveredState.job.final_amount) === 40, "Delivered final amount mismatch.");
  assert(Boolean(deliveredState.job.delivered_at), "Delivered maintenance should set delivered_at.");
  assert(deliveredState.job.payment_account_id === maintenanceAccount.id, "Delivered maintenance payment account mismatch.");
  assert(toNumber(deliveredState.account.current_balance) === balanceBeforeDelivery + 40, "Maintenance account balance mismatch after delivery.");
  assert(toNumber(deliveredState.ledger.amount) === 40, "Maintenance ledger amount mismatch.");
  assert(deliveredState.ledger.entry_type === "income", "Maintenance ledger entry type mismatch.");
  assert(deliveredState.ledger.reference_type === "maintenance_job", "Maintenance ledger reference type mismatch.");
  assert(deliveredState.ledger.reference_id === createdJob.job_id, "Maintenance ledger reference id mismatch.");
  assert(deliveredState.audit.action_type === "update_maintenance_status", "Maintenance update audit log missing.");

  const cancelKey = randomUUID();
  const cancelTarget = runRpcJson(
    dbUrl,
    "create_maintenance_job",
    [
      `p_customer_name => ${sqlLiteral("أحمد الإلغاء")}`,
      `p_device_type => ${sqlLiteral("iPhone 14")}`,
      `p_issue_description => ${sqlLiteral("بطارية")}`,
      `p_idempotency_key => ${sqlLiteral(cancelKey)}`,
      `p_created_by => ${sqlLiteral(adminId)}`
    ].join(", ")
  );

  expectSqlError(
    dbUrl,
    `
      SELECT update_maintenance_job_status(
        p_job_id => ${sqlLiteral(cancelTarget.job_id)},
        p_new_status => 'cancelled'::maintenance_status,
        p_notes => ${sqlLiteral("POS غير مصرح له بالإلغاء")},
        p_created_by => ${sqlLiteral(posId)}
      )
    `,
    "ERR_UNAUTHORIZED"
  );

  const cancelled = runRpcJson(
    dbUrl,
    "update_maintenance_job_status",
    [
      `p_job_id => ${sqlLiteral(cancelTarget.job_id)}`,
      `p_new_status => 'cancelled'::maintenance_status`,
      `p_notes => ${sqlLiteral("إلغاء إداري")}`,
      `p_created_by => ${sqlLiteral(adminId)}`
    ].join(", ")
  );

  assert(cancelled.status === "cancelled", "Admin should be able to cancel maintenance jobs.");

  const results = {
    fixtures: {
      admin_id: adminId,
      pos_id: posId,
      maintenance_account_id: maintenanceAccount.id
    },
    probes: {
      create: {
        job_number: createdJob.job_number,
        status: createdJob.status,
        estimated_cost: toNumber(createdState.job.estimated_cost)
      },
      workflow: {
        in_progress: inProgress.status,
        ready: ready.status,
        ready_notification_count: toNumber(readyState.notification_count),
        delivered: delivered.status,
        delivered_final_amount: toNumber(deliveredState.job.final_amount),
        maintenance_account_balance_before: balanceBeforeDelivery,
        maintenance_account_balance_after: toNumber(deliveredState.account.current_balance),
        ledger_entry_id: delivered.ledger_entry_id
      },
      expected_failures: {
        duplicate_create: "ERR_IDEMPOTENCY",
        invalid_transition: "ERR_MAINTENANCE_INVALID_STATUS",
        pos_cancel: "ERR_UNAUTHORIZED"
      },
      admin_cancel: {
        job_number: cancelTarget.job_number,
        status: cancelled.status
      }
    }
  };

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
