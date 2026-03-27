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

const EMAIL_LABEL = "\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a";
const PASSWORD_LABEL = "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631";
const LOGIN_BUTTON = "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644";

loadEnvConfig(process.cwd());

export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("Missing required runtime env: SUPABASE_SERVICE_ROLE_KEY or SERVICE_ROLE_KEY");
  }

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
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await page.getByLabel(EMAIL_LABEL).fill(email);
  await page.getByLabel(PASSWORD_LABEL).fill(password);
  await page.getByRole("button", { name: LOGIN_BUTTON }).click();

  const expectedPath = targetPath || "/pos";

  try {
    await page.waitForURL((url) => url.pathname === expectedPath, {
      timeout: 15_000
    });
  } catch {
    await page.waitForTimeout(1_000);
    await page.goto(expectedPath, { waitUntil: "domcontentloaded" });
  }

  await page.waitForLoadState("networkidle");

  if (targetPath && !page.url().includes(targetPath)) {
    await page.goto(targetPath, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
  }

  if (!page.url().includes(expectedPath)) {
    const banner = page.locator(".status-banner");
    if (await banner.isVisible()) {
      throw new Error(`Login stayed on ${page.url()} with banner: ${await banner.innerText()}`);
    }

    throw new Error(`Login did not reach ${expectedPath}. Current URL: ${page.url()}`);
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
