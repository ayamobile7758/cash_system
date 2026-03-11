import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  buildReceiptUrl,
  buildWhatsAppMessage,
  getPublicReceiptViewByToken,
  getWhatsAppErrorMeta
} from "../lib/api/communication";
import { getNotificationsPageBaseline } from "../lib/api/notifications";

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

  return JSON.parse(extractStatusJson(raw)) as {
    API_URL: string;
    SERVICE_ROLE_KEY: string;
  };
}

function nowEmail(prefix: string) {
  return `${prefix}-${Date.now()}@local.test`;
}

function uniqueJordanPhone(seed: number) {
  const suffix = String(seed % 100000000).padStart(8, "0");
  return `07${suffix}`;
}

function isoDateShift(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function maybeSingleOrThrow<T>(
  promise: PromiseLike<{ data: T | null; error: { message: string } | null }>,
  label: string
) {
  const { data, error } = await promise;

  if (error || !data) {
    throw new Error(`${label}: ${error?.message ?? "record not found"}`);
  }

  return data;
}

async function runRpc<T>(supabase: any, fn: string, params: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(fn, params);

  if (error) {
    throw new Error(`${fn}: ${error.message}`);
  }

  return data as T;
}

async function createUser(
  supabase: any,
  options: {
    email: string;
    password: string;
    fullName: string;
    role: "admin" | "pos_staff";
  }
) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: options.email,
    password: options.password,
    email_confirm: true,
    user_metadata: {
      full_name: options.fullName,
      role: options.role
    }
  });

  if (error || !data.user) {
    throw new Error(`Failed to create auth user ${options.email}: ${error?.message ?? "unknown error"}`);
  }

  return data.user.id;
}

async function main() {
  const env = getLocalSupabaseEnv();
  const runSeed = Date.now();
  const supabase: any = createClient(env.API_URL, env.SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const adminId = await createUser(supabase, {
    email: nowEmail("px09-admin"),
    password: "LocalPass123!",
    fullName: "PX09 Admin",
    role: "admin"
  });

  const posId = await createUser(supabase, {
    email: nowEmail("px09-pos"),
    password: "LocalPass123!",
    fullName: "PX09 POS",
    role: "pos_staff"
  });

  const cashAccount = await maybeSingleOrThrow(
    supabase
      .from("accounts")
      .select("id, current_balance")
      .eq("type", "cash")
      .eq("module_scope", "core")
      .maybeSingle(),
    "Core cash account not found"
  ) as { id: string; current_balance: number };

  const product = await maybeSingleOrThrow(
    supabase
      .from("products")
      .insert({
        name: `PX09 Product ${Date.now()}`,
        category: "accessory",
        sale_price: 20,
        cost_price: 10,
        avg_cost_price: 10,
        stock_quantity: 10,
        min_stock_level: 2,
        track_stock: true,
        is_quick_add: false,
        created_by: adminId
      })
      .select("id, name")
      .maybeSingle(),
    "Failed to insert product fixture"
  ) as { id: string; name: string };

  const debtCustomer = await maybeSingleOrThrow(
    supabase
      .from("debt_customers")
      .insert({
        name: `PX09 Debt Customer ${Date.now()}`,
        phone: uniqueJordanPhone(runSeed),
        due_date_days: 2,
        current_balance: 0,
        credit_limit: 100,
        created_by: adminId
      })
      .select("id, name, phone")
      .maybeSingle(),
    "Failed to insert debt customer fixture"
  ) as { id: string; name: string; phone: string };

  const sale = await runRpc<{ invoice_id: string; invoice_number: string }>(supabase, "create_sale", {
    p_items: [{ product_id: product.id, quantity: 1 }],
    p_payments: [{ account_id: cashAccount.id, amount: 20 }],
    p_pos_terminal: "PX09-POS-01",
    p_notes: "PX09 receipt proof",
    p_idempotency_key: randomUUID(),
    p_created_by: posId
  });

  const link = await runRpc<{
    token_id: string;
    token: string;
    expires_at: string;
    is_reissued: boolean;
  }>(supabase, "issue_receipt_link", {
    p_invoice_id: sale.invoice_id,
    p_channel: "share",
    p_expires_in_hours: 48,
    p_force_reissue: false,
    p_created_by: posId
  });

  const publicReceipt = await getPublicReceiptViewByToken(supabase as never, link.token);
  assert(publicReceipt.state === "ok", "Public receipt should resolve for an active token.");
  assert(publicReceipt.data.invoice_number === sale.invoice_number, "Public receipt invoice number mismatch.");
  assert(
    JSON.stringify(Object.keys(publicReceipt.data).sort()) ===
      JSON.stringify(["invoice_date", "invoice_number", "items", "store_name", "total"]),
    "Public receipt payload should expose only the allowed top-level fields."
  );
  assert(
    !("customer_phone" in publicReceipt.data) && !("notes" in publicReceipt.data),
    "Public receipt must not expose internal or customer data."
  );
  assert(
    JSON.stringify(Object.keys(publicReceipt.data.items[0] ?? {}).sort()) ===
      JSON.stringify(["line_total", "product_name", "quantity", "unit_price"]),
    "Public receipt items should expose only safe fields."
  );

  const reissued = await runRpc<{
    token_id: string;
    token: string;
    expires_at: string;
    is_reissued: boolean;
  }>(supabase, "issue_receipt_link", {
    p_invoice_id: sale.invoice_id,
    p_channel: "whatsapp",
    p_expires_in_hours: 24,
    p_force_reissue: true,
    p_created_by: adminId
  });
  assert(reissued.is_reissued === true, "Receipt link reissue should be flagged.");
  assert(reissued.token !== link.token, "Reissued receipt token should differ from the revoked token.");

  const originalViewAfterReissue = await getPublicReceiptViewByToken(supabase as never, link.token);
  assert(
    originalViewAfterReissue.state === "revoked",
    "Original receipt token should be revoked automatically after force reissue."
  );

  const revoked = await runRpc<{ token_id: string; revoked: boolean }>(supabase, "revoke_receipt_link", {
    p_token_id: reissued.token_id,
    p_created_by: adminId
  });
  assert(revoked.revoked === true, "Receipt link revocation should succeed.");

  const revokedView = await getPublicReceiptViewByToken(supabase as never, reissued.token);
  assert(revokedView.state === "revoked", "Revoked receipt token should no longer be viewable.");

  const debtSale = await runRpc<{ invoice_id: string; invoice_number: string }>(supabase, "create_sale", {
    p_items: [{ product_id: product.id, quantity: 1 }],
    p_payments: [],
    p_debt_customer_id: debtCustomer.id,
    p_pos_terminal: "PX09-POS-01",
    p_notes: "PX09 debt reminder proof",
    p_idempotency_key: randomUUID(),
    p_created_by: posId
  });

  const debtEntry = await maybeSingleOrThrow(
    supabase
      .from("debt_entries")
      .select("id, due_date, remaining_amount")
      .eq("invoice_id", debtSale.invoice_id)
      .eq("entry_type", "from_invoice")
      .maybeSingle(),
    "Debt entry fixture missing"
  ) as { id: string; due_date: string; remaining_amount: number };

  const dueDate = isoDateShift(1);
  const { error: dueDateUpdateError } = await supabase
    .from("debt_entries")
    .update({ due_date: dueDate })
    .eq("id", debtEntry.id);

  if (dueDateUpdateError) {
    throw new Error(`Failed to update debt due date: ${dueDateUpdateError.message}`);
  }

  const schedulerFirst = await runRpc<{
    processed_count: number;
    created_count: number;
    suppressed_duplicates: number;
  }>(supabase, "run_debt_reminder_scheduler", {
    p_mode: "due",
    p_as_of_date: isoDateShift(0),
    p_created_by: adminId
  });

  const schedulerSecond = await runRpc<{
    processed_count: number;
    created_count: number;
    suppressed_duplicates: number;
  }>(supabase, "run_debt_reminder_scheduler", {
    p_mode: "due",
    p_as_of_date: isoDateShift(0),
    p_created_by: adminId
  });

  assert(schedulerFirst.created_count >= 1, "Debt reminder scheduler should create at least one notification.");
  assert(
    schedulerSecond.suppressed_duplicates >= 1,
    "Second scheduler run should suppress duplicate debt reminders."
  );

  const adminNotifications = await getNotificationsPageBaseline(
    supabase as never,
    { role: "admin", userId: adminId },
    {}
  );
  const posNotifications = await getNotificationsPageBaseline(
    supabase as never,
    { role: "pos_staff", userId: posId },
    {}
  );

  const reminderNotification = adminNotifications.notifications.find(
    (notification) => notification.reference_id === debtEntry.id && notification.type === "debt_due_reminder"
  );
  assert(reminderNotification, "Admin should see the scheduled debt reminder notification.");
  assert(reminderNotification.contact_phone === debtCustomer.phone, "Reminder notification should resolve customer phone.");
  assert(
    !posNotifications.notifications.some((notification) => notification.reference_id === debtEntry.id),
    "POS inbox must not receive admin debt reminder notifications."
  );

  const receiptUrl = buildReceiptUrl("http://localhost", reissued.token);
  const whatsappMessage = await buildWhatsAppMessage(supabase as never, {
    templateKey: "receipt_share",
    referenceType: "invoice",
    referenceId: sale.invoice_id,
    payload: {
      receipt_url: receiptUrl
    }
  });

  assert(whatsappMessage.includes(receiptUrl), "WhatsApp receipt-share message should include the public receipt URL.");
  assert(!whatsappMessage.includes("cost_price"), "WhatsApp payload must not expose internal cost data.");

  const deliveryLog = await runRpc<{ delivery_log_id: string; status: string }>(
    supabase,
    "create_whatsapp_delivery_log",
    {
      p_template_key: "receipt_share",
      p_target_phone: debtCustomer.phone,
      p_reference_type: "invoice",
      p_reference_id: sale.invoice_id,
      p_idempotency_key: randomUUID(),
      p_created_by: adminId
    }
  );

  const deliveryRow = await maybeSingleOrThrow(
    supabase
      .from("whatsapp_delivery_logs")
      .select("target_phone_masked, status, template_key, delivery_mode")
      .eq("id", deliveryLog.delivery_log_id)
      .maybeSingle(),
    "WhatsApp delivery log row missing"
  ) as {
    target_phone_masked: string;
    status: string;
    template_key: string;
    delivery_mode: string;
  };

  assert(deliveryRow.status === "queued", "WhatsApp delivery log should start in queued state.");
  assert(deliveryRow.delivery_mode === "wa_me", "WhatsApp delivery mode should match the wa.me adapter.");
  assert(
    deliveryRow.target_phone_masked.endsWith(debtCustomer.phone.slice(-4)),
    "WhatsApp target phone should be masked."
  );
  assert(
    !deliveryRow.target_phone_masked.includes(debtCustomer.phone.slice(0, 6)),
    "WhatsApp log must not store the raw phone number."
  );

  const result = {
    fixtures: {
      admin_id: adminId,
      pos_id: posId,
      invoice_id: sale.invoice_id,
      debt_entry_id: debtEntry.id
    },
    probes: {
      receipt_link: {
        token_id: link.token_id,
        expires_at: link.expires_at,
        public_state: publicReceipt.state,
        revoked_state: revokedView.state,
        reissued_token_id: reissued.token_id
      },
      public_receipt: {
        top_level_keys: Object.keys(publicReceipt.data).sort(),
        item_keys: Object.keys(publicReceipt.data.items[0] ?? {}).sort()
      },
      debt_scheduler: {
        first_run_created: schedulerFirst.created_count,
        second_run_suppressed_duplicates: schedulerSecond.suppressed_duplicates
      },
      notifications: {
        admin_total: adminNotifications.totalCount,
        pos_total: posNotifications.totalCount
      },
      whatsapp: {
        delivery_log_id: deliveryLog.delivery_log_id,
        status: deliveryRow.status,
        template_key: deliveryRow.template_key,
        masked_phone: deliveryRow.target_phone_masked,
        sample_error_status: getWhatsAppErrorMeta("ERR_WHATSAPP_DELIVERY_FAILED").status
      }
    }
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
