# آية موبايل - التكوين التقني
## 13) Tech Configuration & Project Structure

---

## 🛠️ التقنيات المستخدمة

| التقنية | الإصدار | الغرض |
|---------|---------|-------|
| **Supabase** | Latest | Backend: PostgreSQL + Auth + RLS + Edge Functions |
| **Next.js** | 14+ (App Router) | Frontend framework |
| **React** | 18+ | UI library |
| **TypeScript** | 5+ | لغة البرمجة |
| **Vercel** | - | استضافة + CI/CD |
| **Node.js** | 20 LTS | بيئة التشغيل |

---

## 📦 المكتبات المعتمدة

| المكتبة | الغرض |
|---------|-------|
| `@supabase/supabase-js` | التواصل مع Supabase |
| `@supabase/ssr` | Server-side Supabase client |
| `zustand` | إدارة الحالة (بسيط وخفيف) |
| `date-fns` + `date-fns/locale/ar` | التواريخ بالعربي |
| `zod` | التحقق من البيانات (Validation) |
| `lucide-react` | الأيقونات |
| `sonner` | رسائل Toast |
| `recharts` | الرسوم البيانية في التقارير |

---

## 🌍 المنطقة والتنسيقات

| الجانب | القيمة | مثال |
|--------|--------|------|
| المنطقة الزمنية | `Asia/Amman` | UTC+3 |
| اللغة | العربية (RTL) | - |
| الأرقام | غربية (123) | ✅ `450.000` — ❌ `٤٥٠.٠٠٠` |
| تنسيق المبالغ | `###,###.###` (3 خانات عشرية) | `1,250.500 د.أ` |
| تنسيق التاريخ | `DD/MM/YYYY` | `11/02/2026` |
| تنسيق الوقت | `HH:mm` (24 ساعة) | `14:30` |
| العملة | JOD — رمز العرض: `د.أ` | - |

---

## 🌐 سياسة الاتصال (Network Policy)

- النظام **Online-only** بشكل نهائي (MVP/V1/V2).
- عند انقطاع الإنترنت: تظهر رسالة `ERR_NETWORK` ويُمنع تنفيذ أي عملية مالية.
- لا يوجد Queue محلي ولا مزامنة لاحقة ولا وضع Offline.

---

## 📱 سياسة دعم الأجهزة (Device-Agnostic Web App)

> **القرار:** النظام هو **Web App واحد** يعمل من المتصفح على الهاتف والتابلت واللابتوب بدون استثناء.
> **المرجع المعتمد:** [29_Device_Browser_Policy.md](./29_Device_Browser_Policy.md)

| الجهاز | الحد الأدنى المعتمد | ملاحظات |
|--------|----------------------|---------|
| الهاتف | `360px+` | Touch-first + تخطيط عمودي |
| التابلت | `768px+` | تخطيط هجين (عمودي/أفقي) |
| اللابتوب | `1024px+` | تخطيط كامل مع اختصارات لوحة المفاتيح |

**قواعد إلزامية:**
1. لا يوجد تطبيق Native منفصل (iOS/Android/Desktop) ضمن MVP.
2. الدخول للنظام يتم عبر رابط الويب فقط مع نفس الصلاحيات والسياسات.
3. النظام **قابل للتثبيت كتطبيق ويب** (Add to Home Screen / Install App) على الهاتف أو التابلت أو اللابتوب.
4. التثبيت لا يغيّر سياسة الاتصال: يظل النظام Online-only (لا Offline transactions).
5. أي شاشة تشغيلية (خصوصاً POS) يجب أن تدعم اللمس + لوحة المفاتيح حسب نوع الجهاز.

---

## 📲 قابلية التثبيت على الأجهزة (Web Installability)

| المنصة | طريقة التثبيت | النتيجة |
|--------|---------------|---------|
| Android / iOS | Add to Home Screen من المتصفح | أيقونة تشغيل مباشرة للشاشة الرئيسية |
| Windows / macOS (Chrome/Edge) | Install App من شريط المتصفح | نافذة تطبيق مستقلة (Standalone Window) |

**متطلبات توثيقية للتنفيذ:**
- `manifest.webmanifest` بالأيقونة والاسم والـ display mode.
- `theme-color` و`viewport` مضبوطين لتجربة موبايل سليمة.
- Service Worker (اختياري تقنياً) لا يفعّل أي منطق Offline مالي.

---

## 🏗️ المعمارية: API-First (ADR-042)

> **المبدأ:** جميع عمليات الكتابة (Mutations) تمر حصرياً عبر طبقة API وسيطة (Next.js API Routes / Server Actions). الواجهة لا تتحدث مباشرة مع قاعدة البيانات لأي عملية تُغيّر البيانات.

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Browser   │────▶│  Next.js API    │────▶│   Supabase DB   │
│  (Frontend) │     │  Routes/Actions  │     │   (PostgreSQL)  │
│             │     │  service_role    │     │   RPC Functions  │
└──────┬──────┘     └─────────────────┘     └─────────────────┘
       │                                            ▲
       │            SELECT فقط (قراءة)              │
       └────────────────────────────────────────────┘
         @supabase/ssr — anon_key — RLS enforced
```

| المسار | النوع | الوصف |
|--------|-------|-------|
| الكتابة (Mutations) | Browser → API Route → DB (service_role) | جميع العمليات: بيع، مرتجع، تسديد، مصروف، شراء، صيانة، تسوية |
| القراءة (Queries) | Browser → Supabase (anon_key + RLS) | قراءة مباشرة للجداول غير الحساسة. الجداول الحساسة للـ POS تُقرأ عبر Views آمنة (`v_pos_*`) أو API |

**قواعد إلزامية:**
1. `@supabase/supabase-js` (Browser Client) يُستخدم **للقراءة فقط** عبر `@supabase/ssr`
2. `SUPABASE_SERVICE_ROLE_KEY` يُستخدم **فقط** في API Routes / Server Actions — لا يُكشف للعميل أبداً
3. كل API Route يقوم بـ: التحقق من الجلسة → التحقق من الصلاحيات → Zod Validation → استدعاء RPC → إرجاع StandardEnvelope
4. لا يوجد `INSERT` / `UPDATE` / `DELETE` مباشر من المتصفح على أي جدول
5. **Blind POS:** لا قراءة مباشرة من POS للأعمدة الحساسة (`cost_price`, `current_balance`, `credit_limit`) — فقط عبر Views آمنة أو استجابات API مفلترة
6. **Least-Privilege POS Reads:** لا قراءة مباشرة من POS للجداول المالية الحساسة (`ledger_entries`, `suppliers`, `purchase_orders`, `purchase_items`, `supplier_payments`, `topups`, `transfers`, `expenses`, `reconciliation_entries`)؛ أي وصول لها يتم عبر API محمي فقط

---

## نموذج الصلاحيات الدقيقة (PX-10 Contract)

- `profiles.role` يبقى طبقة authority الأساسية (`admin` أو `pos_staff`) ولا يتوسع إلى أدوار تشغيلية فرعية.
- `permission_bundles` + `role_assignments` يشكلان الطبقة الثانية لتحديد القدرات التشغيلية داخل حدود `profiles.role`.
- `authorizeRequest()` يبقى coarse gate أوليًّا: أي Route تحدد الحد الأدنى (`admin` أو `pos_staff`) ثم تطبق bundle checks داخليًا عند الحاجة.
- bundles لا تفتح direct DB grants جديدة، ولا تغيّر RLS، ولا تتجاوز `fn_require_admin_actor()` أو أي RPC Admin-only قائمة.
- Blind POS يبقى invariant: bundles قد تسمح بعمليات تشغيلية إضافية، لكنها لا تسمح بإظهار `cost_price`, `avg_cost_price`, `current_balance`, `credit_limit`, أو أي حقول محجوبة تعاقديًا.
- discount governance سيعتمد لاحقًا على `permission_bundles.max_discount_percentage` و`discount_requires_approval` مع بقاء `system_settings.max_pos_discount_percentage` كخط أساس عام.

---

## 🔑 متغيرات البيئة (Environment Variables)

### مطلوبة (Required)
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### اختيارية (Optional — لها قيم افتراضية أو تُستخدم فقط عند تفعيل المسار المرتبط بها)
```env
NEXT_PUBLIC_APP_NAME=آية موبايل
NEXT_PUBLIC_CURRENCY=JOD
NEXT_PUBLIC_TIMEZONE=Asia/Amman
NEXT_PUBLIC_POS_TERMINAL_CODE=POS-01
CRON_SECRET=change-me-before-enabling-cron
```

**⚠️ `SUPABASE_SERVICE_ROLE_KEY` لا يُوضع في `NEXT_PUBLIC_` أبداً — للخادم فقط.**

---

## 🧾 إعداد التاريخ التشغيلي (Sales History)

- تاريخ التقارير البيعية يعتمد على `invoice_date` (تاريخ التشغيل).
- وقت الإدخال الفعلي يعتمد على `created_at` (للتدقيق).
- شاشة الفواتير/التقارير يجب أن تدعم فلاتر:
  - من تاريخ / إلى تاريخ
  - المستخدم (`created_by`)
  - الحالة (`status`)
  - كود جهاز POS (`pos_terminal_code`)

---

## ⚡ أهداف الأداء (Performance Targets)

| السيناريو | الهدف |
|----------|-------|
| فتح شاشة POS | ≤ 2 ثانية |
| البحث في POS (بعد كتابة حرفين) | ≤ 400ms |
| إتمام البيع (Create Sale) | ≤ 2 ثانية |
| فتح شاشة الفواتير | ≤ 2 ثانية |
| تحميل صفحة الفواتير | ≤ 3 ثوانٍ |
| تصدير Excel (حتى 10,000 سجل) | ≤ 5 ثوانٍ |
| حساب تقرير الأرباح | ≤ 2 ثانية |
| تحميل Dashboard | ≤ 2 ثانية |

**ملاحظات تشغيلية:**
- الأهداف أعلاه تقاس على اتصال إنترنت مستقر.
- أي تجاوز مستمر للأهداف يُعالج قبل التوسع بميزات جديدة.

---

## 🚀 إرشادات أداء شاشة POS (POS Performance Guidelines)

> **الهدف:** تجربة سلسة وسريعة للموظف أمام العميل — أقل من 2 دقيقة لإتمام أي عملية بيع.

### 1. تحميل المنتجات مسبقاً (Product Pre-loading)

```typescript
// عند فتح شاشة POS — تحميل جميع المنتجات النشطة فوراً
const { data: products } = useSWR('products-active', fetchActiveProducts, {
  revalidateOnFocus: false,      // لا إعادة جلب عند العودة للتبويب
  revalidateOnReconnect: true,   // إعادة جلب عند عودة الإنترنت
  dedupingInterval: 300000,      // 5 دقائق cache
});
```

**القاعدة:** شاشة POS تحمّل جميع المنتجات النشطة (المتوقع < 500 منتج) عند الفتح، والبحث يتم محلياً على البيانات المحملة.

### 2. Debounce على البحث

```typescript
// تأخير 200ms قبل البحث لمنع طلبات كثيرة
const debouncedSearch = useDebouncedCallback((query) => {
  const results = products.filter(p => p.name.includes(query));
  setSearchResults(results);
}, 200);
```

**القاعدة:** لا يبدأ البحث إلا بعد 200ms من توقف الكتابة، وبعد حرفين على الأقل.

### 3. Optimistic UI للسلة

```typescript
// عند إضافة منتج للسلة — تحديث فوري قبل استجابة السيرفر
function addToCart(product) {
  // 1. تحديث الواجهة فوراً (Optimistic)
  setCartItems(prev => [...prev, { ...product, quantity: 1 }]);

  // 2. السيرفر يتحقق لاحقاً عند إتمام البيع
  // لا API call عند الإضافة — فقط عند create_sale()
}
```

**القاعدة:** السلة تعمل محلياً (Zustand state)، والسيرفر يُستدعى فقط عند "إتمام البيع".

### 4. اختصارات لوحة المفاتيح الكاملة

| الاختصار | الوظيفة |
|----------|---------|
| `/` أو `F2` | فتح البحث |
| `Enter` | إتمام البيع (إذا السلة غير فارغة) |
| `Esc` | إلغاء/إغلاق النافذة الحالية |
| `↑` / `↓` | التنقل في نتائج البحث |
| `+` / `-` | زيادة/إنقاص الكمية للعنصر المحدد |
| `Delete` | حذف العنصر المحدد من السلة |
| `F1` | نقدي فقط (اختصار سريع) |
| `F3` | فيزا فقط (اختصار سريع) |
| `F4` | دفع مختلط |
| `Tab` | التنقل بين الحقول |

### 5. Loading States (Skeleton)

```
┌─────────────────────────────────────────┐
│  ████████████████  (شريط بحث)          │
│                                         │
│  [████] [████] [████] [████]  (chips)  │
│                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐            │
│  │ ████ │ │ ████ │ │ ████ │  (منتجات) │
│  │ ████ │ │ ████ │ │ ████ │            │
│  └──────┘ └──────┘ └──────┘            │
└─────────────────────────────────────────┘
```

**القاعدة:** أثناء التحميل، تظهر عناصر skeleton بدلاً من شاشة فارغة.

### 6. صوت وتأكيد بصري

| الحدث | الصوت | التأكيد البصري |
|-------|-------|----------------|
| إتمام البيع بنجاح | `sale-complete.mp3` | شاشة تأكيد خضراء 2 ثانية |
| خطأ (مخزون/دفع) | بدون صوت | Toast أحمر مع الرسالة |
| إضافة منتج للسلة | بدون صوت | وميض خفيف على العنصر |

### 7. شاشة ما بعد البيع (Post-Sale Confirmation)

```
┌─────────────────────────────────────────┐
│                  ✅                     │
│            تم البيع بنجاح               │
│                                         │
│  الفاتورة: AYA-2026-00045              │
│  الإجمالي: 46,200 د.أ                   │
│  الباقي: 3,800 د.أ                      │
│                                         │
│  [🆕 فاتورة جديدة]   [📄 عرض الفاتورة]  │
└─────────────────────────────────────────┘
```

**القاعدة:** تظهر لـ 3 ثوانٍ ثم تختفي تلقائياً، أو يضغط الموظف "فاتورة جديدة".

### 8. معالجة انقطاع الشبكة أثناء البيع

```
┌─────────────────────────────────────────┐
│  ⚠️ انقطع الاتصال بالإنترنت             │
│                                         │
│  لا يمكن إتمام البيع حالياً.            │
│  السلة محفوظة — جرب مرة أخرى.           │
│                                         │
│        [🔄 إعادة المحاولة]              │
└─────────────────────────────────────────┘
```

**القاعدة:** السلة لا تُحذف عند انقطاع الشبكة — تبقى محفوظة في الذاكرة المحلية.

---

## 👥 تشغيل متعدد نقاط البيع (Concurrent Multi-POS)

- يدعم النظام تشغيل أكثر من مستخدم في نفس الوقت من أجهزة مختلفة داخل نفس المتجر.
- كل جهاز يستخدم حساب مستخدم مستقل (لا مشاركة حساب بين موظفين).
- يوصى بتعيين `NEXT_PUBLIC_POS_TERMINAL_CODE` مختلف لكل جهاز (مثل: `POS-01`, `POS-02`).
- سلامة البيانات تعتمد على:
  - PostgreSQL Transactions
  - `SELECT FOR UPDATE` في عمليات المخزون
  - **ترتيب قفل ثابت:** قفل المنتجات دائماً بترتيب `product_id ASC` لتقليل deadlocks
  - **Retry Policy:** عند `deadlock_detected (40P01)` أو `lock_not_available (55P03)` يعاد التنفيذ تلقائياً (مرتين كحد أقصى) قبل إرجاع `ERR_CONCURRENT_STOCK_UPDATE`
  - `idempotency_key` لمنع تكرار الطلبات

---

## 📂 هيكل مجلدات المشروع

```
aya-mobile/
├── aya-mobile-documentation/   # التوثيق (هذا المجلد)
├── app/                        # Next.js App Router
│   ├── (auth)/
│   │   └── login/page.tsx      # تسجيل الدخول
│   ├── api/                        # API Routes — ADR-042
│   │   ├── sales/
│   │   │   ├── route.ts            # create_sale (service_role)
│   │   │   └── history/route.ts    # get_sales_history (read via RPC)
│   │   ├── invoices/
│   │   │   ├── cancel/route.ts     # cancel_invoice
│   │   │   └── edit/route.ts       # edit_invoice
│   │   ├── returns/route.ts        # create_return (full/partial)
│   │   ├── debts/
│   │   │   └── manual/route.ts     # create_debt_manual
│   │   ├── payments/
│   │   │   ├── debt/route.ts       # create_debt_payment
│   │   │   └── supplier/route.ts   # create_supplier_payment
│   │   ├── expenses/route.ts       # create_expense
│   │   ├── topups/route.ts         # create_topup
│   │   ├── transfers/route.ts      # create_transfer
│   │   ├── purchases/route.ts      # create_purchase
│   │   ├── maintenance/route.ts    # create_maintenance_job
│   │   ├── reconciliation/route.ts # reconcile_account
│   │   ├── inventory/
│   │   │   └── counts/
│   │   │       └── complete/route.ts # complete_inventory_count
│   │   ├── snapshots/route.ts      # create_daily_snapshot
│   │   ├── settings/route.ts       # update_settings (Admin)
│   │   └── health/route.ts         # GET health check
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Sidebar + Header + Notifications
│   │   ├── page.tsx            # الرئيسية (Dashboard)
│   │   ├── pos/page.tsx        # نقطة البيع
│   │   ├── invoices/
│   │   │   ├── page.tsx        # قائمة الفواتير
│   │   │   └── [id]/page.tsx   # تفاصيل فاتورة
│   │   ├── products/
│   │   │   ├── page.tsx        # قائمة المنتجات
│   │   │   └── new/page.tsx    # إضافة منتج
│   │   ├── debts/
│   │   │   ├── page.tsx        # العملاء والديون
│   │   │   └── [id]/page.tsx   # تفاصيل عميل
│   │   ├── returns/page.tsx    # المرتجعات
│   │   ├── accounts/page.tsx   # الحسابات
│   │   ├── expenses/page.tsx   # المصروفات
│   │   ├── reports/            # التقارير
│   │   │   ├── daily/page.tsx
│   │   │   ├── sales/page.tsx
│   │   │   └── stock/page.tsx
│   │   ├── settings/page.tsx   # الإعدادات (Admin)
│   │   ├── audit-log/page.tsx  # سجل النظام (Admin)
│   │   └── maintenance/        # الصيانة (V1)
│   ├── layout.tsx              # RTL + Font + Theme
│   └── globals.css             # Global CSS Variables (Tailwind optional لاحقاً)
├── components/
│   ├── ui/                     # Button, Input, Modal, Table, Card, Badge
│   ├── pos/                    # ProductSearch, Cart, PaymentPanel, PostSale
│   ├── forms/                  # ProductForm, ExpenseForm, DebtPaymentForm
│   ├── layout/                 # Sidebar, Header, NotificationBell
│   └── shared/                 # EmptyState, LoadingSpinner, ConfirmDialog
├── hooks/
│   ├── use-products.ts
│   ├── use-invoices.ts
│   ├── use-debts.ts
│   ├── use-accounts.ts
│   ├── use-notifications.ts
│   └── use-auth.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser client
│   │   └── server.ts           # Server client
│   ├── utils/
│   │   ├── format-currency.ts  # تنسيق المبالغ
│   │   ├── format-date.ts      # تنسيق التواريخ
│   │   └── cn.ts               # classNames helper
│   ├── validations/            # Zod schemas
│   └── constants.ts            # ثوابت النظام
├── types/
│   ├── database.ts             # Supabase generated types
│   └── index.ts                # أنواع مخصصة
├── public/
│   ├── logo_icon.png
│   ├── logo_horizontal.png
│   └── sounds/
│       └── sale-complete.mp3   # صوت إتمام البيع
├── supabase/
│   ├── migrations/             # SQL migrations (مرتبة زمنياً)
│   └── seed.sql                # بيانات أولية
├── .env.local                  # متغيرات البيئة (لا تُرفع على Git)
├── .gitignore
├── package.json
├── tsconfig.json
└── next.config.js
```

---

## 🧭 مصفوفة تغطية عمليات DB ↔ API Routes (ADR-042)

| عملية DB في `05` | RPC Function في `15` | API Route | الملاحظات |
|------------------|----------------------|-----------|-----------|
| 1. `CreateSale` | `create_sale()` | `POST /api/sales` | كتابة عبر `service_role` |
| 1.1 `GetSalesHistory` | `get_sales_history()` | `GET /api/sales/history` | قراءة مع صلاحيات الدور |
| 2. `CreateReturn` | `create_return()` | `POST /api/returns` | `return_type='full'` |
| 3. `CreateDebtManual` | `create_debt_manual()` | `POST /api/debts/manual` | Admin only |
| 4. `RecordDebtPayment` | `create_debt_payment()` | `POST /api/payments/debt` | FIFO by default |
| 5. `CreateTopUp` | `create_topup()` | `POST /api/topups` | idempotent write |
| 6. `CreateTransfer` | `create_transfer()` | `POST /api/transfers` | Admin only |
| 7. `CreatePurchase` | `create_purchase()` | `POST /api/purchases` | `is_paid` + `unit_cost` |
| 8. `CreateReconciliation` | `reconcile_account()` | `POST /api/reconciliation` | Admin only |
| 9. `RecordSupplierPayment` | `create_supplier_payment()` | `POST /api/payments/supplier` | Admin only |
| 10. `GenerateDailySnapshot` | `create_daily_snapshot()` | `POST /api/snapshots` | Admin only |
| 11. `CreateMaintenanceJob` | `create_maintenance_job()` | `POST /api/maintenance` | Admin/POS |
| 12. `CancelInvoice` | `cancel_invoice()` | `POST /api/invoices/cancel` | Admin only |
| 13. `EditInvoice` | `edit_invoice()` | `POST /api/invoices/edit` | Admin only |
| 14. `CreatePartialReturn` | `create_return()` | `POST /api/returns` | `return_type='partial'` |
| 15. `CompleteInventoryCount` | `complete_inventory_count()` | `POST /api/inventory/counts/complete` | Admin only |

**عمليات إضافية خارج قائمة DB-15:**  
- `update_settings()` عبر `POST /api/settings` (Admin only).
- `fn_verify_balance_integrity()` عبر `POST /api/health/balance-check` (Admin only) — فحص سلامة الأرصدة المالية.

### Drift Authority Map (Canonical)

| Layer | Canonical Name | Notes |
|-------|----------------|-------|
| Scheduled Job | `T-10 Balance Integrity Daily` | تنفيذ يومي منتصف الليل |
| Cron Route | `POST /api/cron/balance-check` | server-to-server فقط |
| Admin Route | `POST /api/health/balance-check` | تشغيل يدوي من لوحة الإدارة |
| RPC Function | `fn_verify_balance_integrity()` | الدالة الوحيدة المعتمدة لفحص الانحراف |
| Alert/Audit | `notifications.type='reconciliation_difference'` + `audit_logs` | عند وجود drift فقط |

**Aliases Deprecated (ممنوعة):** `check_balance_drift()`, `verify_balance_integrity()`, `/api/cron/verify-integrity`.

---

## 🗄️ إعداد Supabase

| الإعداد | القيمة |
|---------|--------|
| **Region** | Central EU (الأقرب للأردن) |
| **Plan** | Free (يكفي لمتجر صغير) |
| **Auth** | Email/Password فقط |
| **RLS** | مفعل على جميع الجداول (29) |
| **Realtime** | مفعل على `notifications` فقط |

---

## 🚀 قائمة تحقق النشر (Deployment Checklist)

### مرحلة 1: البنية التحتية
- [ ] إنشاء مشروع Supabase (Region: EU Central)
- [ ] تشغيل جميع SQL Migrations
- [ ] تشغيل Seed Data (حسابات + فئات + إعدادات)
- [ ] تفعيل RLS على جميع الجداول
- [ ] إنشاء المستخدمَين (أحمد Admin + الموظف POS Staff `pos_staff`)

### مرحلة 2: النشر
- [ ] ربط Vercel بـ GitHub repo
- [ ] إعداد Environment Variables في Vercel
- [ ] اختبار Build ناجح
- [ ] تعيين Domain (اختياري)

### مرحلة 3: الاختبار
- [ ] تسجيل دخول أحمد ✅
- [ ] تسجيل دخول الموظف ✅
- [ ] بيع نقدي ✅
- [ ] بيع مختلط ✅
- [ ] بيع بدين ✅
- [ ] مرتجع ✅
- [ ] تسديد دين ✅
- [ ] تسوية حساب ✅
- [ ] بيعان متزامنان من جهازين مختلفين لنفس المنتج لا ينتج عنهما مخزون سالب ✅
- [ ] فلتر هيستوري المبيعات حسب التاريخ/المستخدم/الجهاز يعمل ✅
- [ ] صوت إتمام البيع يعمل ✅
- [ ] الإشعارات تعمل ✅
- [ ] التقارير تعمل ✅
- [ ] RLS يمنع الموظف من عمليات Admin ✅
- [ ] انقطاع الإنترنت يظهر `ERR_NETWORK` ويمنع الحفظ ✅
- [ ] اختبار تشغيل أساسي من هاتف + تابلت + لابتوب ✅
- [ ] اختبار التثبيت (A2HS/Install App) يعمل على الأجهزة المدعومة ✅

---

## 🔗 الملفات المرتبطة

- [05_Database_Design.md](./05_Database_Design.md) - الجداول والعلاقات
- [09_Implementation_Plan.md](./09_Implementation_Plan.md) - خطة التنفيذ
- [11_Design_UX_Guidelines.md](./11_Design_UX_Guidelines.md) - إرشادات التصميم وتجربة المستخدم
- [25_API_Contracts.md](./25_API_Contracts.md) - عقود API التفصيلية
- [07_Definitions_Glossary.md](./07_Definitions_Glossary.md) - مرجع المصطلحات المعتمد

---

**الإصدار:** 1.4  
**تاريخ التحديث:** 11 فبراير 2026  
**التغييرات:** إضافة إدارة الجلسات، Security Headers، ترقيم الصفحات، التخزين المؤقت، النسخ الاحتياطي، أهداف الحمل.

---

## 🔔 آلية تسليم الإشعارات (Notification Delivery)

- الإشعارات تُخزن في جدول `notifications` (راجع [05_Database_Design.md](./05_Database_Design.md)).
- **آلية التسليم:** Supabase Realtime مُفعّل على جدول `notifications` فقط.
- الواجهة تشترك في الـ Realtime channel عند تسجيل الدخول وتعرض إشعاراً فورياً عند إدخال سجل جديد.
- **مكون NotificationBell** في Header يعرض عدد الإشعارات غير المقروءة ويتحدث تلقائياً.
- لا يوجد Push Notifications خارجي — فقط إشعارات داخل التطبيق.

---

## 🔐 إدارة الجلسات (Session Management)

| الإعداد | القيمة | الملاحظة |
|---------|--------|----------|
| **مزود المصادقة** | Supabase Auth (JWT) | لا حاجة لإدارة جلسات مخصصة |
| **مدة الـ Access Token** | 1 ساعة (3600 ثانية) | الافتراضي في Supabase |
| **مدة الـ Refresh Token** | 7 أيام | إعادة تسجيل الدخول أسبوعياً |
| **سلوك انتهاء الجلسة** | إعادة توجيه تلقائي لصفحة تسجيل الدخول | رسالة "انتهت الجلسة — سجّل دخولك مجدداً" |
| **تعدد الأجهزة** | مسموح — كل جهاز جلسة منفصلة | لا يوجد حد أقصى لعدد الجلسات |
| **تخزين Token** | `localStorage` عبر Supabase JS SDK | يُحذف عند تسجيل الخروج |

---

## 🛡️ Security Headers (Vercel)

```javascript
// next.config.js → headers()
{
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload'
}
```

---

## 📄 مواصفات ترقيم الصفحات (Pagination)

| الشاشة | `page_size` الافتراضي | الحد الأقصى | نوع الترقيم |
|--------|----------------------|-------------|-------------|
| قائمة الفواتير | 20 | 100 | أرقام صفحات |
| المنتجات | 20 | 50 | أرقام صفحات |
| سجل التدقيق | 30 | 100 | أرقام صفحات |
| الإشعارات | 10 | 50 | تحميل تلقائي عند التمرير |
| تقارير (export) | الكل | لا حد | تصدير كامل (CSV) |

**القاعدة:** جميع الاستعلامات التي تُرجع قائمة يجب أن تدعم `page` + `page_size` + `total_count` في الاستجابة.

---

## 💾 استراتيجية التخزين المؤقت (Caching — V2)

> **ملاحظة:** MVP لا يحتاج caching — البيانات تُجلب مباشرة. هذه الاستراتيجية لـ V2 عند زيادة الحمل.

| البيانات | استراتيجية التخزين | مدة الصلاحية |
|----------|-------------------|-------------|
| قائمة المنتجات النشطة | `stale-while-revalidate` | 5 دقائق |
| فئات المنتجات | Cache ثابت | 24 ساعة |
| فئات المصروفات | Cache ثابت | 24 ساعة |
| إعدادات النظام | Cache ثابت | حتى تغيير |
| الفواتير/التقارير | لا cache — بيانات حية | — |

---

## 💿 أتمتة النسخ الاحتياطي

| الطبقة | الآلية | التكرار | الاحتفاظ |
|--------|--------|---------|----------|
| **Supabase** | Daily Backups تلقائي | يومي | 7 أيام (مجاني) |
| **Google Drive** | `pg_dump` عبر Apps Script أو يدوي | أسبوعي (الجمعة) | 4 نسخ |
| **Daily Snapshot** | دالة `create_daily_snapshot()` | يومي (نهاية الدوام) | دائم في DB |

**إجراء الطوارئ:** راجع [ADR-038](./10_ADRs.md) لخطوات الاستعادة.

---

## 🏋️ أهداف اختبار الحمل (Load Targets)

| المقياس | الهدف | السبب |
|---------|-------|-------|
| **عدد المستخدمين المتزامنين** | 5 | Admin + 2 POS + 2 احتياط |
| **زمن استجابة البيع** | < 2 ثانية | تجربة سلسة عند الزبون |
| **زمن تحميل الصفحة** | < 3 ثوانٍ | First Contentful Paint |
| **حجم البيانات المتوقع (سنة)** | ~10,000 فاتورة + ~50,000 قيد | لا حاجة لـ sharding |
| **Uptime المستهدف** | 99.5% | ~44 ساعة downtime/سنة مقبول |


---

## 🚦 Rate Limiting

> **مرجع:** OWASP API Security — Rate Limiting Best Practices

| Endpoint | الحد | السلوك عند التجاوز |
|----------|------|--------------------|
| **Login** (`/auth/v1/token`) | 5 محاولات / دقيقة / IP | HTTP 429 + lockout 5 دقائق |
| **API Write** (`/api/sales`, `/api/returns`, etc.) | 30 طلب / دقيقة / user | HTTP 429 |
| **API/RPC Read** (reports, lists) | 100 طلب / دقيقة / user | HTTP 429 |
| **Auth Signup** | معطّل (Admin يُنشئ الحسابات) | N/A |

**التنفيذ:**
- **Login:** Supabase Auth يوفر rate limiting مدمج على endpoints المصادقة (يجب تأكيد الإعداد الافتراضي عند النشر)
- **API Write:** Vercel Edge Middleware على مسارات `/api/*` (ADR-042)

**Brute Force Protection:**
- Supabase Auth يحد محاولات تسجيل الدخول الفاشلة تلقائياً
- لا حاجة لـ CAPTCHA — النظام داخلي وليس عاماً
- بعد 5 محاولات فاشلة: الانتظار 5 دقائق قبل المحاولة التالية

---

## 🛡️ موقف CSRF

> النظام يستخدم **Bearer Token** في `Authorization` header لجميع API calls (وليس cookies).
> لذلك **CSRF ليس attack vector فعلي** — هجمات CSRF تعتمد على إرسال cookies تلقائياً مع الطلبات، وهذا لا يحدث مع Bearer tokens.
>
> **لا حاجة لرموز CSRF.**

---

## 🏥 Health Check

| الإعداد | القيمة |
|---------|--------|
| **Endpoint** | `GET /api/health` |
| **Response (PX-01 Baseline)** | `{ "status": "ok", "timestamp": "..." }` — HTTP 200 |
| **Response (PX-02+ Degraded)** | `{ "status": "degraded", "timestamp": "..." }` — HTTP 503 |
| **ما يفحص الآن** | App liveness فقط في `PX-01` |
| **ما يفحص لاحقاً** | اتصال DB (query بسيط على `system_settings`) بعد تثبيت طبقة قاعدة البيانات في `PX-02` |
| **الاستخدام** | UptimeRobot يستدعيه كل 5 دقائق؛ DB-aware health يُفعّل بعد اكتمال `PX-02` |

---

## 🔔 استراتيجية التنبيهات (Alerting)

| التنبيه | الشرط | الأداة | المستقبل |
|---------|-------|--------|---------|
| **Site Down** | Health check يرجع 503 أو لا يرد | UptimeRobot (مجاني) | أحمد بالإيميل |
| **فشل Backup أسبوعي** | Apps Script لم يُنفّذ pg_dump بنجاح | Apps Script notification | أحمد بالإيميل |
| **Balance Drift** | `fn_verify_balance_integrity()` يكتشف فرق ≠ 0 | إشعار داخلي (`reconciliation_difference`) | أحمد في النظام |

**ملاحظة:** هذه 3 تنبيهات كافية لفرع واحد. عند التوسع، يُضاف: error rate spike, slow queries, disk usage.

---

## 📋 استراتيجية التسجيل (Logging)

### ما يُسجّل (Log)
| الحدث | المستوى | أين |
|-------|---------|-----|
| فشل أي عملية مالية (sale/return/payment) | `error` | Vercel Logs |
| فشل Login | `warn` | Vercel Logs |
| Rate limit hit | `warn` | Vercel Logs |
| Balance drift detected | `error` | Vercel Logs + audit_logs |
| Unhandled exception | `error` | Vercel Logs |

### ما لا يُسجّل
- Navigation events
- Successful reads
- رسائل debug في Production

### الأداة والاحتفاظ
| الأداة | التكلفة | الاحتفاظ |
|--------|---------|----------|
| **Vercel Logs** (مدمج) | مجاني | 1 ساعة (Free) / 3 أيام (Pro) |
| **Sentry Free** (اختياري) | مجاني (5K events/شهر) | 30 يوم |

**التنسيق:** `console.error()` / `console.warn()` في catch blocks — يظهر تلقائياً في Vercel Logs.

---

## 🎯 RPO/RTO

| المقياس | القيمة | التبرير |
|---------|--------|---------|
| **RPO** (Recovery Point Objective) | ≤ 24 ساعة | Supabase daily backup تلقائي |
| **RTO** (Recovery Time Objective) | ≤ 4 ساعات | استعادة من Supabase Dashboard + تحقق drift |

**سيناريو أسوأ حالة:** فقدان بيانات يوم واحد كحد أقصى. الاستعادة من Supabase Point-in-Time Recovery أو من pg_dump الأسبوعي + إعادة إدخال العمليات المفقودة يدوياً.

**اختبار الاستعادة:** راجع [SOP-25](./08_SOPs.md) — يُنفّذ مرة قبل Go-Live + مرة كل 6 أشهر.

---

## 🔐 التحكم بالوصول للنسخ الاحتياطية (Backup Access Control)

| الصلاحية | من يملكها | الأداة |
|----------|----------|--------|
| تنزيل Supabase Backup | أحمد (Admin) فقط | Supabase Dashboard |
| الوصول لـ pg_dump الأسبوعي | أحمد فقط | Google Drive (مجلد مقيد) |
| استعادة Backup | أحمد + المطور (يتطلب الاثنين) | Supabase CLI / Dashboard |
| حذف Backup | لا أحد يدوياً | تلقائي بعد 7 أيام |

> **تنبيه:** Backups تحتوي **كل البيانات بما فيها PII**. الوصول لها = الوصول لكل البيانات. راجع [18_Data_Retention_Privacy.md](./18_Data_Retention_Privacy.md).

---

## 🔒 إخفاء PII في السجلات (PII Masking in Logs)

| القاعدة | مثال |
|---------|------|
| لا أسماء في log messages | ❌ `User أحمد failed` → ✅ `User [UUID] failed` |
| لا إيميلات في logs | ❌ `ahmed@...` → ✅ `user_id: abc-123` |
| لا أرقام هواتف كاملة في exports | عرض `077****321` إلا لـ Admin |
| لا PII في رسائل الخطأ | استخدم error codes من [16_Error_Codes.md](./16_Error_Codes.md) |

---

## ⏰ سلامة الساعة (Clock Sanity)

| المبدأ | التفاصيل |
|--------|----------|
| **المصدر:** | `now()` في PostgreSQL (server time) — لا نعتمد على وقت الجهاز |
| **المنطقة:** | `Asia/Amman` (UTC+3) — ADR-037 |
| **الحماية:** | `created_at DEFAULT now()` في كل الجداول — لا يُرسل من Frontend |
| **جهاز وقتُه غلط:** | لا تأثير — الأوقات كلها server-side |
| **التحقق:** | `action_timestamp` في audit_logs = `now()` من DB وليس من العميل |

> **القاعدة:** `invoice_date = CURRENT_DATE` دائماً — لا يُسمح بالـ Backdating لأي مستخدم (ADR-034 مُعدّل). أي تصحيح يتم عبر قيد تسوية بتاريخ اليوم.

---

## 📦 صيغة استجابة RPC الموحدة (Unified RPC Response Format)

جميع دوال RPC تتبع نفس الصيغة:

### عند النجاح (HTTP 200)
```json
{
  "success": true,
  "data": { /* النتيجة حسب الدالة — راجع 15_Seed_Data_Functions.md */ }
}
```

### عند الفشل (HTTP 4xx/5xx)
```json
{
  "success": false,
  "error": {
    "code": "ERR_STOCK_INSUFFICIENT",
    "message": "المخزون غير كافٍ لهذا المنتج",
    "details": { "product_id": "...", "requested_qty": 5, "available_qty": 2 }
  }
}
```

| القاعدة | التفاصيل |
|---------|----------|
| `success` | دائماً `true`/`false` — Frontend يفحصه أولاً |
| `error.code` | ERR_* من [16_Error_Codes.md](./16_Error_Codes.md) — لا أكواد عشوائية |
| `error.message` | النسخة العربية من رسالة المستخدم |
| `error.details` | الحقول المسجّلة (logged_fields) من Error Codes catalog |
| HTTP Status | يطابق عمود HTTP في Error Codes (400/401/403/409/429/500/503) |

---

## 🔁 سلوك إعادة المحاولة و Idempotency (Retry & Idempotency Behavior)

### كيف يعمل Idempotency

```
Frontend                          Backend (RPC)
   │                                  │
   ├─ يولّد UUID v4 ──────────────────┤
   │  (idempotency_key)               │
   ├─ يرسل الطلب ─────────────────────┤
   │                                  ├── يفحص: هل idempotency_key موجود؟
   │                                  │   ├── لا → ينفذ العملية → يُرجع 200
   │                                  │   └── نعم → يُرجع 409 + النتيجة السابقة
   │◀ يستقبل النتيجة ─────────────────┤
```

### قواعد الـ Frontend

| الحالة | سلوك Frontend |
|--------|---------------|
| **HTTP 200** (نجاح) | عرض النتيجة + تنظيف النموذج |
| **HTTP 409** (idempotency) | عرض النتيجة السابقة — لا شيء جديد تم إنشاؤه |
| **HTTP 400** (validation) | عرض رسالة الخطأ — المستخدم يُصحح ويُعيد **بنفس** `idempotency_key` |
| **HTTP 500/503** (server) | عرض "حاول مجدداً" — المستخدم يُعيد **بنفس** `idempotency_key` |
| **Timeout** | عرض "حاول مجدداً" — المستخدم يُعيد **بنفس** `idempotency_key` |
| **ERR_CONCURRENT_STOCK_UPDATE** (409) | عرض رسالة + زر "أعد المحاولة" — يولّد `idempotency_key` **جديد** |

> **القاعدة الذهبية:** 
> - نفس العملية = نفس المفتاح → آمن للإعادة
> - عملية جديدة = مفتاح جديد 
> - الاستثناء الوحيد: `ERR_CONCURRENT_STOCK_UPDATE` → مفتاح جديد لأن الكميات تغيرت

### سياسة idempotency لكل Command (Authority Table)

| Command | Policy | Authority Key |
|---------|--------|---------------|
| `create_sale` | Required | `invoices.idempotency_key` |
| `create_return` | Required | `returns.idempotency_key` |
| `create_debt_manual` | Required | `debt_entries.idempotency_key` |
| `create_debt_payment` | Required | `debt_payments.idempotency_key` |
| `create_purchase` | Required | `purchase_orders.idempotency_key` |
| `create_supplier_payment` | Required | `supplier_payments.idempotency_key` |
| `create_topup` | Required | `topups.idempotency_key` |
| `create_transfer` | Required | `transfers.idempotency_key` |
| `create_expense` | Required | `expenses.idempotency_key` |
| `create_maintenance_job` | Required | `maintenance_jobs.idempotency_key` |
| `create_daily_snapshot` | Natural-Key | `UNIQUE(snapshot_date)` (MVP single-branch) |
| `reconcile_account` | Forbidden | غير مطبّق idempotency_key في V1 |
| `cancel_invoice` | Forbidden | غير مطبّق idempotency_key في V1 |
| `complete_inventory_count` | Forbidden | غير مطبّق idempotency_key في V1 |
| `update_settings` | Forbidden | غير مطبّق idempotency_key في V1 |

### الجداول التي تدعم idempotency_key

| الجدول | العمود | Constraint |
|--------|--------|-----------|
| `invoices` | `idempotency_key` | UNIQUE WHERE NOT NULL |
| `returns` | `idempotency_key` | UNIQUE WHERE NOT NULL |
| `debt_entries` | `idempotency_key` | UNIQUE WHERE NOT NULL |
| `debt_payments` | `idempotency_key` | UNIQUE WHERE NOT NULL |
| `supplier_payments` | `idempotency_key` | UNIQUE WHERE NOT NULL |
| `topups` | `idempotency_key` | UNIQUE WHERE NOT NULL |
| `transfers` | `idempotency_key` | UNIQUE WHERE NOT NULL |
| `maintenance_jobs` | `idempotency_key` | UNIQUE WHERE NOT NULL |
| `purchase_orders` | `idempotency_key` | UNIQUE WHERE NOT NULL |
| `expenses` | `idempotency_key` | UNIQUE WHERE NOT NULL |
| `daily_snapshots` | `snapshot_date` | UNIQUE (Natural-Key Idempotency) |

> **التطابق:** هذه القائمة مطابقة لسياسة idempotency في ADR-033/041.

---

**الإصدار:** 2.3  
**تاريخ التحديث:** 5 مارس 2026  
**التغييرات:** v2.3 — توحيد Drift Authority (`fn_verify_balance_integrity`) + إضافة Drift Authority Map + توسيع Idempotency Authority Table + ربط مرجع سياسة الأجهزة `29_Device_Browser_Policy.md`.
