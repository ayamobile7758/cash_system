import { unstable_cache } from "next/cache";
import { getUnreadNotificationCount } from "@/lib/api/notifications";
import { hasPermission, type WorkspaceRole } from "@/lib/permissions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { globalSearchQuerySchema, type GlobalSearchQueryInput, type SearchEntity } from "@/lib/validations/search";

type SearchParamsInput = Record<string, string | string[] | undefined>;

type SearchViewer = {
  role: WorkspaceRole;
  userId: string;
  permissions: string[];
};

type ProductSearchCatalogRow = {
  id: string;
  name: string;
  sku: string | null;
  category: string;
};

type InvoiceSearchRow = {
  id: string;
  invoice_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  pos_terminal_code: string | null;
  status: string;
  created_by: string;
};

type DebtCustomerSearchRow = {
  id: string;
  name: string;
  phone: string | null;
};

type MaintenanceSearchCatalogRow = {
  id: string;
  job_number: string;
  customer_name: string;
  device_type: string;
  status: string;
};

export type GlobalSearchFilters = {
  q: string;
  entity: SearchEntity | "all";
  limit: number;
};

export type GlobalSearchItem = {
  entity: SearchEntity;
  id: string;
  label: string;
  secondary: string;
};

export type GlobalSearchGroup = {
  entity: SearchEntity;
  title: string;
  items: GlobalSearchItem[];
};

export type GlobalSearchBaseline = {
  filters: GlobalSearchFilters;
  items: GlobalSearchItem[];
  groups: GlobalSearchGroup[];
  totalCount: number;
  allowedEntities: SearchEntity[];
  errorMessage: string | null;
};

export type AlertsSummary = {
  low_stock: number;
  overdue_debts: number;
  reconciliation_drift: number;
  maintenance_ready: number;
  unread_notifications: number;
};

async function readMaybeCached<T>(cachedQuery: () => Promise<T>, fallbackQuery: () => Promise<T>) {
  try {
    return await cachedQuery();
  } catch (error) {
    if (error instanceof Error && error.message.includes("incrementalCache missing")) {
      return fallbackQuery();
    }

    throw error;
  }
}

function appendSearchParam(target: URLSearchParams, key: string, value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    for (const item of value) {
      target.append(key, item);
    }
    return;
  }

  if (value) {
    target.set(key, value);
  }
}

export function toSearchParams(searchParams: SearchParamsInput) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    appendSearchParam(params, key, value);
  }

  return params;
}

function toPositiveInteger(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
}

export function readGlobalSearchFilters(searchParams: URLSearchParams): GlobalSearchFilters {
  const q = (searchParams.get("q") ?? "").trim();
  const rawEntity = searchParams.get("entity");
  const entity = globalSearchQuerySchema.shape.entity.safeParse(rawEntity).success
    ? (rawEntity as SearchEntity)
    : "all";

  return {
    q,
    entity,
    limit: toPositiveInteger(searchParams.get("limit"), 12, 20)
  };
}

export function getAllowedSearchEntities(permissions: string[]) {
  const allowed: SearchEntity[] = [];

  if (hasPermission(permissions, "products.read")) {
    allowed.push("product");
  }

  if (hasPermission(permissions, "invoices.read")) {
    allowed.push("invoice");
  }

  if (hasPermission(permissions, "debts.read")) {
    allowed.push("debt_customer");
  }

  if (hasPermission(permissions, "maintenance.read")) {
    allowed.push("maintenance_job");
  }

  return allowed;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function maskPhone(value: string | null | undefined) {
  if (!value) {
    return "بدون هاتف";
  }

  const trimmed = value.replace(/\s+/g, "");
  if (trimmed.length <= 4) {
    return trimmed;
  }

  return `${"*".repeat(Math.max(0, trimmed.length - 4))}${trimmed.slice(-4)}`;
}

function scoreSearchMatch(label: string, secondary: string, query: string) {
  const normalizedLabel = normalizeText(label);
  const normalizedSecondary = normalizeText(secondary);

  let score = 0;

  if (normalizedLabel.startsWith(query)) {
    score += 4;
  } else if (normalizedLabel.includes(query)) {
    score += 2;
  }

  if (normalizedSecondary.startsWith(query)) {
    score += 1.5;
  } else if (normalizedSecondary.includes(query)) {
    score += 0.75;
  }

  return score;
}

function filterAndRankResults(
  items: GlobalSearchItem[],
  query: string,
  limit: number
) {
  const normalizedQuery = normalizeText(query);

  return items
    .map((item) => ({
      item,
      score: scoreSearchMatch(item.label, item.secondary, normalizedQuery)
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.item.label.localeCompare(right.item.label, "ar");
    })
    .slice(0, limit)
    .map((entry) => entry.item);
}

function getEntityTitle(entity: SearchEntity) {
  switch (entity) {
    case "product":
      return "المنتجات";
    case "invoice":
      return "الفواتير";
    case "debt_customer":
      return "الديون";
    case "maintenance_job":
      return "الصيانة";
  }
}

function toSearchGroups(items: GlobalSearchItem[]) {
  const groups = new Map<SearchEntity, GlobalSearchItem[]>();

  for (const item of items) {
    const list = groups.get(item.entity) ?? [];
    list.push(item);
    groups.set(item.entity, list);
  }

  return (["product", "invoice", "debt_customer", "maintenance_job"] as const)
    .filter((entity) => groups.has(entity))
    .map((entity) => ({
      entity,
      title: getEntityTitle(entity),
      items: groups.get(entity) ?? []
    })) satisfies GlobalSearchGroup[];
}

async function queryProductSearchCatalog(
  supabase: ReturnType<typeof getSupabaseAdminClient>
) {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, sku, category")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(400)
    .returns<ProductSearchCatalogRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function queryMaintenanceSearchCatalog(
  supabase: ReturnType<typeof getSupabaseAdminClient>
) {
  const { data, error } = await supabase
    .from("maintenance_jobs")
    .select("id, job_number, customer_name, device_type, status")
    .order("job_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(250)
    .returns<MaintenanceSearchCatalogRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

const getCachedProductSearchCatalog = unstable_cache(
  async () => queryProductSearchCatalog(getSupabaseAdminClient()),
  ["px13-search-products"],
  { revalidate: 120 }
);

const getCachedMaintenanceSearchCatalog = unstable_cache(
  async () => queryMaintenanceSearchCatalog(getSupabaseAdminClient()),
  ["px13-search-maintenance"],
  { revalidate: 120 }
);

async function searchProducts(
  query: string,
  limit: number,
  options?: { useCache?: boolean }
) {
  const catalog = options?.useCache === true
    ? await readMaybeCached(
        () => getCachedProductSearchCatalog(),
        () => queryProductSearchCatalog(getSupabaseAdminClient())
      )
    : await queryProductSearchCatalog(getSupabaseAdminClient());

  return filterAndRankResults(
    catalog.map((product) => ({
      entity: "product",
      id: product.id,
      label: product.name,
      secondary: product.sku ? `${product.sku} · ${product.category}` : product.category
    })),
    query,
    limit
  );
}

async function searchInvoices(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  viewer: SearchViewer,
  query: string,
  limit: number
) {
  const pattern = `%${query.replace(/[%_*]/g, " ").trim()}%`;

  let invoiceQuery = supabase
    .from("invoices")
    .select("id, invoice_number, customer_name, customer_phone, pos_terminal_code, status, created_by")
    .or(
      `invoice_number.ilike.${pattern},customer_name.ilike.${pattern},customer_phone.ilike.${pattern},pos_terminal_code.ilike.${pattern}`
    );

  if (viewer.role !== "admin") {
    invoiceQuery = invoiceQuery.eq("created_by", viewer.userId);
  }

  const { data, error } = await invoiceQuery
    .order("invoice_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<InvoiceSearchRow[]>();
  if (error) {
    throw error;
  }

  return (data ?? []).map((invoice) => ({
    entity: "invoice" as const,
    id: invoice.id,
    label: invoice.invoice_number,
    secondary: [invoice.customer_name ?? null, invoice.pos_terminal_code ?? null, invoice.status]
      .filter(Boolean)
      .join(" · ")
  }));
}

async function searchDebtCustomers(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  viewer: SearchViewer,
  query: string,
  limit: number
) {
  const pattern = `%${query.replace(/[%_*]/g, " ").trim()}%`;

  const source = viewer.role === "admin" ? "debt_customers" : "v_pos_debt_customers";
  const { data, error } = await supabase
    .from(source)
    .select("id, name, phone")
    .eq("is_active", true)
    .or(`name.ilike.${pattern},phone.ilike.${pattern}`)
    .order("name", { ascending: true })
    .limit(limit)
    .returns<DebtCustomerSearchRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).map((customer) => ({
    entity: "debt_customer" as const,
    id: customer.id,
    label: customer.name,
    secondary: maskPhone(customer.phone)
  }));
}

async function searchMaintenanceJobs(
  query: string,
  limit: number,
  options?: { useCache?: boolean }
) {
  const catalog = options?.useCache === true
    ? await readMaybeCached(
        () => getCachedMaintenanceSearchCatalog(),
        () => queryMaintenanceSearchCatalog(getSupabaseAdminClient())
      )
    : await queryMaintenanceSearchCatalog(getSupabaseAdminClient());

  return filterAndRankResults(
    catalog.map((job) => ({
      entity: "maintenance_job",
      id: job.id,
      label: job.job_number,
      secondary: `${job.customer_name} · ${job.device_type} · ${job.status}`
    })),
    query,
    limit
  );
}

export async function searchGlobal(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  viewer: SearchViewer,
  filters: GlobalSearchQueryInput,
  options?: { useCache?: boolean }
) {
  const allowedEntities = getAllowedSearchEntities(viewer.permissions);
  const targetEntities = filters.entity
    ? allowedEntities.includes(filters.entity)
      ? [filters.entity]
      : []
    : allowedEntities;

  if (targetEntities.length === 0) {
    return [];
  }

  const perEntityLimit = filters.entity
    ? filters.limit
    : Math.max(3, Math.ceil(filters.limit / targetEntities.length));

  const results = await Promise.all(
    targetEntities.map(async (entity) => {
      switch (entity) {
        case "product":
          return searchProducts(filters.q, perEntityLimit, options);
        case "invoice":
          return searchInvoices(supabase, viewer, filters.q, perEntityLimit);
        case "debt_customer":
          return searchDebtCustomers(supabase, viewer, filters.q, perEntityLimit);
        case "maintenance_job":
          return searchMaintenanceJobs(filters.q, perEntityLimit, options);
      }
    })
  );

  return results.flat().slice(0, filters.limit);
}

export async function getGlobalSearchPageBaseline(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  viewer: SearchViewer,
  searchParams: SearchParamsInput
): Promise<GlobalSearchBaseline> {
  const filters = readGlobalSearchFilters(toSearchParams(searchParams));
  const allowedEntities = getAllowedSearchEntities(viewer.permissions);

  if (!filters.q) {
    return {
      filters,
      items: [],
      groups: [],
      totalCount: 0,
      allowedEntities,
      errorMessage: null
    };
  }

  const parsed = globalSearchQuerySchema.safeParse({
    q: filters.q,
    entity: filters.entity === "all" ? undefined : filters.entity,
    limit: filters.limit
  });

  if (!parsed.success) {
    return {
      filters,
      items: [],
      groups: [],
      totalCount: 0,
      allowedEntities,
      errorMessage: parsed.error.issues[0]?.message ?? "تعذر تفسير طلب البحث."
    };
  }

  const items = await searchGlobal(supabase, viewer, parsed.data);

  return {
    filters,
    items,
    groups: toSearchGroups(items),
    totalCount: items.length,
    allowedEntities,
    errorMessage: null
  };
}

export async function getAlertsSummary(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  viewer: Pick<SearchViewer, "role" | "userId">
) {
  if (viewer.role !== "admin") {
    return null;
  }

  const today = new Date().toISOString().slice(0, 10);

  const [productsResult, overdueResult, driftResult, maintenanceReadyResult, unreadNotifications] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, stock_quantity, min_stock_level")
        .eq("is_active", true)
        .returns<Array<{ id: string; stock_quantity: number; min_stock_level: number }>>(),
      supabase
        .from("debt_entries")
        .select("id", { count: "exact", head: true })
        .eq("is_paid", false)
        .lt("due_date", today),
      supabase
        .from("reconciliation_entries")
        .select("id", { count: "exact", head: true })
        .eq("is_resolved", false)
        .neq("difference", 0),
      supabase
        .from("maintenance_jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "ready"),
      getUnreadNotificationCount(supabase, {
        role: viewer.role,
        userId: viewer.userId
      })
    ]);

  if (productsResult.error) {
    throw productsResult.error;
  }

  if (overdueResult.error) {
    throw overdueResult.error;
  }

  if (driftResult.error) {
    throw driftResult.error;
  }

  if (maintenanceReadyResult.error) {
    throw maintenanceReadyResult.error;
  }

  const lowStock = (productsResult.data ?? []).filter(
    (product) => product.stock_quantity <= product.min_stock_level
  ).length;

  return {
    low_stock: lowStock,
    overdue_debts: overdueResult.count ?? 0,
    reconciliation_drift: driftResult.count ?? 0,
    maintenance_ready: maintenanceReadyResult.count ?? 0,
    unread_notifications: unreadNotifications
  } satisfies AlertsSummary;
}
