"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getSafeArabicErrorMessage } from "@/lib/error-messages";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
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
              toast.error(getSafeArabicErrorMessage(error, "تعذر تسجيل الخروج. أعد المحاولة."));
              return;
            }

            router.replace("/");
          })();
        });
      }}
    >
      {isPending ? <Loader2 className="spin" size={16} /> : <LogOut size={16} />}
      تسجيل الخروج
    </button>
  );
}
