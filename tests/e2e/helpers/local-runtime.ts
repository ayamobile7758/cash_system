import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";

export type WorkspaceRole = "admin" | "pos_staff";

export type FixtureUser = {
  id: string;
  email: string;
  password: string;
  role: WorkspaceRole;
};

type ServiceRoleClient = SupabaseClient;

loadEnvConfig(process.cwd());

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required runtime env: ${name}`);
  }

  return value;
}

export function createServiceRoleClient() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

async function waitForProfile(supabase: ServiceRoleClient, userId: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle<{ id: string }>();

    if (error) {
      throw error;
    }

    if (data?.id) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Profile row did not appear for auth user ${userId}.`);
}

export async function createFixtureUser(
  supabase: ServiceRoleClient,
  role: WorkspaceRole,
  prefix: string,
  password = "LocalPass123!"
) {
  const email = `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}@local.test`;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: `${prefix} user`,
      role
    }
  });

  if (error || !data.user) {
    throw new Error(`Failed to create ${role} auth user ${email}: ${error?.message ?? "unknown error"}`);
  }

  await waitForProfile(supabase, data.user.id);

  return {
    id: data.user.id,
    email,
    password,
    role
  } satisfies FixtureUser;
}

export async function login(page: Page, email: string, password: string, targetPath = "/pos") {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await page.getByLabel("البريد الإلكتروني").fill(email);
  await page.getByLabel("كلمة المرور").fill(password);
  await page.getByRole("button", { name: "الدخول إلى بيئة التشغيل" }).click();
  await page.waitForURL("**/pos");

  if (targetPath !== "/pos") {
    await page.goto(targetPath, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
  }
}

export async function expectNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth + 2;
  });

  expect(hasOverflow).toBeFalsy();
}

export function percentile(values: number[], p: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * p) - 1);
  return sorted[index];
}
