import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";
import type { Database } from "@/types/supabase";

type SupabaseAdminClient = SupabaseClient<Database, "public", any>;

let cachedAdminClient: SupabaseAdminClient | null = null;

export function getSupabaseAdminClient() {
  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  const env = getServerEnv();

  cachedAdminClient = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return cachedAdminClient;
}

export function resetSupabaseAdminClientForTests() {
  cachedAdminClient = null;
}
