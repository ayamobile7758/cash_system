import { NextResponse } from "next/server";
import {
  authorizeRequest,
  getApiErrorMeta,
  handleRouteError
} from "@/lib/api/common";
import type { PosAccount, StandardEnvelope } from "@/lib/pos/types";

const ACCOUNT_COLUMNS = [
  "id",
  "name",
  "type",
  "module_scope",
  "fee_percentage",
  "is_active",
  "display_order",
  "created_at",
  "updated_at"
].join(", ");

type AccountsResponseData = {
  items: PosAccount[];
};

export async function GET() {
  try {
    const authorization = await authorizeRequest(["admin", "pos_staff"], {
      requiredPermissions: ["pos.use"]
    });

    if (!authorization.authorized) {
      return authorization.response;
    }

    const { data, error } = await authorization.supabase
      .from("accounts")
      .select(ACCOUNT_COLUMNS)
      .eq("is_active", true)
      .eq("module_scope", "core")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json<StandardEnvelope<AccountsResponseData>>(
      {
        success: true,
        data: {
          items: ((data ?? []) as unknown) as PosAccount[]
        }
      },
      { status: 200 }
    );
  } catch (error) {
    return handleRouteError(error, getApiErrorMeta);
  }
}
