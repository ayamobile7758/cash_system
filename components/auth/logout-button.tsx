"use client";

import { useTransition } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="secondary-button"
      disabled={isPending}
      onClick={() => {
        startTransition(() => {
          void (async () => {
            const supabase = createSupabaseBrowserClient();
            const { error } = await supabase.auth.signOut();

            if (error) {
              toast.error(error.message);
              return;
            }

            window.location.href = "/";
          })();
        });
      }}
    >
      {isPending ? <Loader2 className="spin" size={16} /> : <LogOut size={16} />}
      تسجيل الخروج
    </button>
  );
}
