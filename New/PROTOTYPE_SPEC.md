# Aya Mobile Prototype Specification

This document is the implementation brief for extending `New/design-preview.html` into a complete interactive single-file HTML prototype that covers the full Aya Mobile case study. The goal is not to reproduce the React code literally. The goal is to preserve the current visual language and CSS contracts from the preview, expand it to all real routes, and simulate the actual workflows, states, and transitions found in the codebase.

## Section 1 - Screen Inventory

| Screen ID | Screen Name (Arabic) | Route | Component File | Priority (1=core, 2=important, 3=secondary) |
|---|---|---|---|---|
| AUTH-01 | تسجيل الدخول | `/`, `/login` | `components/auth/login-entry-page.tsx` | 1 |
| HOME-01 | ملخص التشغيل اليومي | `/home` | `components/dashboard/dashboard-home.tsx` | 1 |
| POS-01 | نقطة البيع | `/pos` | `components/pos/pos-workspace.tsx` | 1 |
| CAT-01 | المنتجات | `/products` | `components/pos/products-browser.tsx` | 1 |
| INV-01 | الفواتير | `/invoices` | `components/dashboard/invoices-workspace.tsx` | 1 |
| INV-02 | تفاصيل الفاتورة | `/invoices/[id]` | `components/dashboard/invoice-detail.tsx` | 1 |
| DEBT-01 | الديون | `/debts` | `components/dashboard/debts-workspace.tsx` | 1 |
| STOCK-01 | الجرد | `/inventory` | `components/dashboard/inventory-workspace.tsx` | 1 |
| NOTIF-01 | الإشعارات | `/notifications` | `components/dashboard/notifications-workspace.tsx` | 2 |
| SEARCH-01 | البحث الشامل | `/search` | `components/dashboard/search-workspace.tsx` | 2 |
| EXP-01 | المصروفات | `/expenses` | `components/dashboard/expenses-workspace.tsx` | 2 |
| SUP-01 | الموردون | `/suppliers` | `components/dashboard/suppliers-workspace.tsx` | 2 |
| OPS-01 | الشحن والتحويلات | `/operations` | `components/dashboard/operations-workspace.tsx` | 2 |
| MAIN-01 | الصيانة الأساسية | `/maintenance` | `components/dashboard/maintenance-workspace.tsx` | 2 |
| REP-01 | التقارير | `/reports` | `components/dashboard/reports-overview.tsx` | 2 |
| SET-01 | الإعدادات | `/settings` | `components/dashboard/settings-ops.tsx` | 2 |
| PORT-01 | النقل والاستيراد والاستعادة | `/portability` | `components/dashboard/portability-workspace.tsx` | 3 |
| PUB-01 | الإيصال العام | `/r/[token]` | `app/r/[token]/page.tsx` | 3 |
| SYS-01 | جهاز غير مدعوم | `/unsupported-device` | `app/unsupported-device/page.tsx` | 3 |
| SYS-02 | تنظيف الكاش المحلي | `/reset-cache` | `app/reset-cache/page.tsx` | 3 |
| SYS-03 | شاشة التحميل العامة | `/(dashboard)` loading fallback | `app/(dashboard)/loading.tsx` | 3 |
| SYS-04 | شاشة الخطأ العامة | `/(dashboard)` error fallback | `app/(dashboard)/error.tsx` | 3 |
| SYS-05 | الوصول غير المصرح به | any protected route fallback | `components/dashboard/access-required.tsx`, `components/pos/access-required.tsx` | 2 |
| SHELL-01 | هيكل التنقل العام | shared shell for all protected routes | `components/dashboard/dashboard-shell.tsx` | 1 |

## Section 2 - Navigation Map

### 2.1 Nav Popover Structure

The shell-level nav popover is the main navigation model for protected routes. It must stay persistent across all protected screens except the public receipt and authentication flows.

- `daily` group:
  - `/pos` -> نقطة البيع
  - `/products` -> المنتجات
  - `/invoices` -> الفواتير
  - `/debts` -> الديون
  - `/notifications` -> الإشعارات
- `operations` group:
  - `/expenses` -> المصروفات
  - `/inventory` -> الجرد
  - `/suppliers` -> الموردون
  - `/operations` -> الشحن والتحويلات
  - `/maintenance` -> الصيانة الأساسية
- `management` group:
  - `/home` -> ملخص التشغيل اليومي
  - `/reports` -> التقارير
  - `/portability` -> النقل والاستيراد والاستعادة
  - `/settings` -> الإعدادات

### 2.2 Mobile Bottom Bar

Keep the mobile bottom bar exactly as the current shell behavior:

- `/pos` -> label `البيع`
- `/products` -> label `المنتجات`
- `/invoices` -> label `الفواتير`
- `/inventory` -> label `الجرد`
- menu trigger -> label `القائمة`

The bottom bar is mobile-only and does not replace the nav popover. It is a shortcut strip for the highest-frequency routes.

### 2.3 Topbar Utilities

- Menu button opens the nav popover on tablet/desktop and a bottom sheet on mobile.
- Search icon on non-POS routes opens the shell search flow and routes to `/search`.
- Notifications icon routes to `/notifications` and shows unread emphasis when needed.
- Account chip remains visible inside the shell and also appears in the popover footer.

### 2.4 Primary Screen-to-Screen Flows

- Login -> successful login routes into the protected shell, usually `/home` or `/pos`.
- Home -> alerts link directly into `/notifications`, `/invoices`, `/debts`, `/inventory`, `/maintenance`.
- POS -> successful sale creates a new invoice and exposes a detail/receipt path.
- Invoices list -> invoice row -> `/invoices/[id]`.
- Invoice detail -> share link -> `/r/[token]`.
- Invoice detail -> returns or cancel -> updates the same invoice detail view after confirmation.
- Notifications -> `فتح المرجع` routes to the related module.
- Notifications search -> results route to `/products`, `/invoices`, `/debts`, or `/maintenance`.
- Global search -> result card routes to the owning module with the selected entity context.
- Products -> in admin mode, selecting a product opens the edit form in the same screen.
- Inventory -> create count -> active count detail -> complete count -> history.
- Settings -> permissions, snapshot, integrity, reconciliation, inventory, and policies all stay inside `/settings` as internal sections.
- Portability -> export/import/restore/history all stay inside `/portability` as internal sections.

### 2.5 Non-Shell Routes

- Public receipt route `/r/[token]` is standalone and read-only.
- `/unsupported-device` is a standalone informational route.
- `/reset-cache` is a standalone utility route that redirects back to `/login`.
- Dashboard loading, error, and access-required states should be modeled as shell-adjacent fallback screens, not as normal nav destinations.

## Section 3 - Screen Specifications

### تسجيل الدخول

- **Layout pattern**: split authentication screen; left form column, right brand/pattern column.
- **Key data shown**: heading, login form fields, brand title, value proposition copy, install prompt.
- **User actions**:
  - Submit credentials -> show button loading, then route into the shell.
  - Trigger install prompt -> open browser/PWA install affordance inline.
  - Switch to reset cache or unsupported path only via utility links outside the main form flow.
- **States to show in prototype**: default form, invalid credentials inline error, submitting state, device blocked handoff to unsupported-device route.
- **Realistic data**: use sample operator names in helper copy only, for example `مدير الفرع الرئيسي`, `كاشير الصباح`, `مشرف الجرد`.
- **Special components**: split layout, brand illustration layer, install prompt slot, form-level error banner.

### ملخص التشغيل اليومي

- **Layout pattern**: page header + compact alert region + quick KPI cards + latest invoices list.
- **Key data shown**: daily sales total, invoice count, overdue debt, unread alerts, latest invoices, latest status prompts.
- **User actions**:
  - `فتح نقطة البيع` -> navigate to `/pos`; shell stays intact.
  - Alert card click -> navigate to the owning module with matching context.
  - `فتح الفواتير` -> navigate to `/invoices`.
  - Invoice row click -> navigate to `/invoices/[id]`.
- **States to show in prototype**: filled dashboard, no alerts state, no recent invoices state, loading skeleton, shell error fallback.
- **Realistic data**:

  | رقم الفاتورة | العميل | الإجمالي | الحالة | الوقت |
  |---|---|---|---|---|
  | INV-24051 | بيع مباشر | 189.000 د.أ | نشطة | اليوم 10:24 |
  | INV-24050 | أحمد الحربي | 425.500 د.أ | نشطة | اليوم 09:58 |
  | INV-24047 | شركة الرواد | 1,120.000 د.أ | مرتجع جزئي | الأمس 18:12 |

- **Special components**: alert cards that route to modules, compact daily summary cards, recent invoice strip.

### نقطة البيع

- **Layout pattern**: anchored split POS layout; product browsing area + docked cart rail; mobile uses products/cart tabs and cart sheet.
- **Key data shown**: searchable products, category chips, quick-add products, held carts count, selected customer, cart items, subtotal, discount, fees, total, split payments, completion summary.
- **User actions**:
  - Search or scan -> filters product grid instantly and keeps focus in the search field.
  - Product tap -> adds item to cart and updates cart summary immediately.
  - Edit quantity / item discount / invoice discount -> update totals in place.
  - Select customer -> attach customer and reveal debt/payment implications.
  - Hold cart -> store current cart in held carts tray; restore keeps previous contents.
  - Toggle split payments -> reveal additional payment rows and fee calculations.
  - Checkout -> move cart panel into processing state, then success state with invoice number.
  - Clear cart -> open confirmation dialog, then empty the cart and return to cart state.
- **States to show in prototype**: filled cart, empty cart, no products found, offline cached mode, sync retry banner, held carts available, checkout processing, success state, clear-cart confirmation.
- **Realistic data**:

  | الصنف | SKU | السعر | المخزون | ملاحظات |
  |---|---|---|---|---|
  | iPhone 13 128GB أزرق | IP13-128-BL | 315.000 د.أ | 4 | سريع |
  | Galaxy A15 128GB | SAM-A15-128 | 145.000 د.أ | 9 | عادي |
  | شاحن 20W أصلي | ACC-CH20W | 12.500 د.أ | 28 | سريع |
  | حماية شاشة Nano | ACC-GLS-NANO | 6.000 د.أ | 34 | ملحق |

  | عنصر السلة | الكمية | سعر الوحدة | الخصم | الإجمالي |
  |---|---|---|---|---|
  | iPhone 13 128GB أزرق | 1 | 315.000 د.أ | 0% | 315.000 د.أ |
  | شاحن 20W أصلي | 2 | 12.500 د.أ | 10% | 22.500 د.أ |
  | حماية شاشة Nano | 1 | 6.000 د.أ | 0% | 6.000 د.أ |

- **Special components**: held cart tray, split payment builder, customer search results, sticky checkout panel, mobile cart sheet, success receipt state.

### المنتجات

- **Layout pattern**: management catalog workspace; optional admin form at top, sticky search/filter sidebar, product card grid.
- **Key data shown**: total products, low stock count, quick-add count, category chips, product cards, admin form fields for create/edit, offline/loading/error banners.
- **User actions**:
  - Search by name/SKU/description -> filter cards live.
  - Category chip tap -> narrow visible products instantly.
  - `تحديث` -> reload data and dismiss stale/offline state when possible.
  - Admin `منتج جديد` -> clear form and switch to create mode.
  - Admin product card click or `تحرير` -> load selected product into the form.
  - Admin `حفظ التعديلات` / `إنشاء المنتج` -> show saving state then success toast/result.
  - Admin `تعطيل` -> disable product and refresh list.
  - `تحميل المزيد` -> append more products to the existing grid.
- **States to show in prototype**: filled catalog, no-results after search, empty catalog, offline cached mode, loading skeleton, load-more state, admin create mode, admin edit mode, save error state.
- **Realistic data**:

  | المنتج | التصنيف | SKU | سعر البيع | المخزون |
  |---|---|---|---|---|
  | iPhone 13 128GB أزرق | أجهزة | IP13-128-BL | 315.000 د.أ | 4 |
  | Galaxy A15 128GB | أجهزة | SAM-A15-128 | 145.000 د.أ | 9 |
  | شاحن 20W أصلي | إكسسوارات | ACC-CH20W | 12.500 د.أ | 28 |
  | شريحة زين 10GB | شرائح | SIM-ZAIN-10 | 5.000 د.أ | خدمة |
  | حماية شاشة Nano | إكسسوارات | ACC-GLS-NANO | 6.000 د.أ | 34 |

- **Special components**: quick-add card grid, admin form with checkboxes, sticky filter/search rail, offline banner.

### الفواتير

- **Layout pattern**: page header + search toolbar + sort chips + stacked invoice rows.
- **Key data shown**: invoice number, date, customer, terminal, total amount, debt amount, invoice discount amount, invoice status.
- **User actions**:
  - Search by invoice/customer/terminal -> filter rows instantly.
  - Sort by newest/highest/due -> reorder rows in place.
  - `فاتورة جديدة` -> route to POS.
  - Invoice row click -> route to invoice detail.
- **States to show in prototype**: filled list, no results after search, empty invoices state, role badge variants for admin vs POS.
- **Realistic data**:

  | رقم الفاتورة | العميل | الجهاز | الإجمالي | الدين | الحالة |
  |---|---|---|---|---|---|
  | INV-24051 | بيع مباشر | POS-01 | 189.000 د.أ | 0.000 د.أ | نشطة |
  | INV-24050 | أحمد الحربي | POS-02 | 425.500 د.أ | 120.000 د.أ | نشطة |
  | INV-24047 | شركة الرواد | POS-01 | 1,120.000 د.أ | 0.000 د.أ | مرتجع جزئي |
  | INV-24040 | ليان سمير | POS-03 | 78.000 د.أ | 0.000 د.أ | مرتجعة |

- **Special components**: full-row invoice links, debt/status badges, sort chip cluster.

### تفاصيل الفاتورة

- **Layout pattern**: master detail summary card on the main column + action/returns/admin card on the secondary column.
- **Key data shown**: invoice totals before/after discount, customer info, terminal, item lines, payment lines, share link state, returnable quantities, historical returns, admin cancel summary.
- **User actions**:
  - `العودة إلى الفواتير` -> route back to list.
  - `طباعة الإيصال` -> trigger browser print.
  - `إنشاء رابط مشاركة` -> create public receipt link and reveal copy/open/revoke actions.
  - `واتساب` -> open prepared WhatsApp URL in a new window for admins when phone exists.
  - Enter return quantities and reason -> open confirmation dialog and create return.
  - Enter cancel reason -> open confirmation dialog and cancel invoice for admin only.
- **States to show in prototype**: normal overview, active share link, WhatsApp prepared state, no customer phone state, returns state, historical returns state, admin cancel state, processing banner, action error banner.
- **Realistic data**:

  | البند | الكمية | المرتجع سابقًا | سعر الوحدة | الإجمالي |
  |---|---|---|---|---|
  | iPhone 13 128GB أزرق | 1 | 0 | 315.000 د.أ | 315.000 د.أ |
  | شاحن 20W أصلي | 2 | 0 | 12.500 د.أ | 25.000 د.أ |
  | حماية شاشة Nano | 1 | 1 | 6.000 د.أ | 6.000 د.أ |

  | حساب الدفع | المبلغ | الصافي | الرسوم |
  |---|---|---|---|
  | صندوق الفرع الرئيسي | 200.000 د.أ | 200.000 د.أ | 0.000 د.أ |
  | بنك القاهرة عمان | 225.500 د.أ | 221.000 د.أ | 4.500 د.أ |

- **Special components**: receipt link management block, returns quantity list, historical returns cards, destructive confirmation dialogs.

### الديون

- **Layout pattern**: customer list rail + selected customer detail panel with internal modes for ledger/manual debt/payment.
- **Key data shown**: customer name, phone, credit limit or due days, current balance, debt entries, remaining amount, due date, payment account, payment allocations.
- **User actions**:
  - Search customer -> filter customer list in place.
  - Customer click -> update detail panel and summary cards.
  - Admin `دين يدوي` -> open manual debt form and save new debt entry.
  - `التسديد` -> open payment form; optional entry targeting or FIFO auto-allocation.
  - Retry after action failure -> rerun the last failed create/payment request.
- **States to show in prototype**: customer selected with open ledger, no customers found, no open entries, manual debt success, payment success with receipt number, action error banner.
- **Realistic data**:

  | العميل | الهاتف | الرصيد الحالي | الحد | الاستحقاق |
  |---|---|---|---|---|
  | أحمد الحربي | 0798123456 | 120.000 د.أ | 300.000 د.أ | 14 يومًا |
  | ليان سمير | 0789988776 | 45.500 د.أ | 150.000 د.أ | 7 أيام |
  | شركة الرواد | 065552211 | 820.000 د.أ | 1,500.000 د.أ | 30 يومًا |

  | نوع القيد | المبلغ الأصلي | المتبقي | الاستحقاق | الوصف |
  |---|---|---|---|---|
  | فاتورة دين | 200.000 د.أ | 120.000 د.أ | 2026-04-12 | مبيعات أجهزة |
  | دين يدوي | 25.500 د.أ | 25.500 د.أ | 2026-04-09 | ملحقات مؤجلة |
  | فاتورة دين | 400.000 د.أ | 300.000 د.أ | 2026-04-20 | توريد شركة |

- **Special components**: selectable customer rail, FIFO payment helper text, manual debt result card, balance warning badge.

### الإشعارات

- **Layout pattern**: multi-mode center with internal tabs for inbox, alerts summary, and global search.
- **Key data shown**: unread count, total count, role label, notification cards, alert chips, search results by entity, notification type/status labels, timestamps, optional user name.
- **User actions**:
  - `تعليم الكل كمقروء` -> update all unread notifications and refresh counts.
  - `تعليم كمقروء` -> update one item in place.
  - `إرسال واتساب` -> prepare and open WhatsApp share for eligible admin notifications.
  - `فتح المرجع` -> route to linked module.
  - Switch between inbox/alerts/search -> keep the page route but swap internal mode.
  - Search submit -> rerender grouped entity results inside the same screen.
- **States to show in prototype**: filled inbox, no matching notifications, alerts summary with chips, no alerts state, global search with grouped results, empty search start state, search no-results state, mark-as-read error state.
- **Realistic data**:

  | العنوان | النوع | الحالة | الوقت | المرجع |
  |---|---|---|---|---|
  | مخزون منخفض: شاحن 20W أصلي | مخزون منخفض | غير مقروء | اليوم 11:05 | المنتجات |
  | دين متأخر: أحمد الحربي | دين متأخر | غير مقروء | اليوم 09:40 | الديون |
  | صيانة جاهزة: JOB-24014 | صيانة جاهزة | مقروء | الأمس 17:22 | الصيانة |
  | فروقات تسوية في صندوق الفرع | فروقات تسوية | مقروء | الأمس 16:10 | الجرد |

- **Special components**: alert summary chips, notification feed cards, embedded global search mode, mark-all action.

### البحث الشامل

- **Layout pattern**: header + stat cards + entity filter chips + grouped result cards.
- **Key data shown**: active query, total result count, allowed entity count, entity groups, result label, secondary text.
- **User actions**:
  - Change entity chip -> reload the same route with the new entity filter.
  - Click result card -> navigate to the owning screen.
  - Empty query -> show initial prompt, not fake results.
- **States to show in prototype**: initial empty query state, filled grouped results, filtered entity results, parser error state, no-results state.
- **Realistic data**:

  | الكيان | العنوان | السطر الثانوي | المسار |
  |---|---|---|---|
  | المنتجات | iPhone 13 128GB أزرق | SKU IP13-128-BL | `/products` |
  | الفواتير | INV-24051 | أحمد الحربي - 425.500 د.أ | `/invoices` |
  | الديون | أحمد الحربي | رصيد 120.000 د.أ | `/debts` |
  | الصيانة | JOB-24014 | شاشة مكسورة - جاهز للتسليم | `/maintenance` |

- **Special components**: entity chips rendered as links, grouped result sections, lightweight error banner.

### المصروفات

- **Layout pattern**: KPI strip + internal sections for create, recent, and category management.
- **Key data shown**: total expenses this month, entry count, active category count, expense form fields, recent expense cards, category drafts for admin.
- **User actions**:
  - `تسجيل المصروف` -> save a new expense and show result card.
  - `إدارة الفئات` -> switch into category management for admins.
  - Update category draft -> save changes inline per category card.
  - Retry after failure -> rerun the last failed create/update request.
- **States to show in prototype**: filled create state with recent list, empty recent list, admin categories state, action error banner, successful create, successful category update.
- **Realistic data**:

  | رقم المصروف | الفئة | الحساب | الوصف | المبلغ |
  |---|---|---|---|---|
  | EXP-24031 | كهرباء | صندوق الفرع الرئيسي | فاتورة كهرباء الأسبوع | 38.250 د.أ |
  | EXP-24029 | رواتب جزئية | بنك القاهرة عمان | سلفة موظف المبيعات | 120.000 د.أ |
  | EXP-24028 | شحن داخلي | محفظة زين كاش | تحويل رصيد تشغيلي | 15.000 د.أ |
  | EXP-24024 | نظافة | صندوق الفرع الرئيسي | مواد تنظيف الفرع | 9.500 د.أ |

  | الفئة | النوع | الترتيب | الحالة |
  |---|---|---|---|
  | كهرباء | ثابتة | 10 | مفعلة |
  | رواتب جزئية | متغيرة | 20 | مفعلة |
  | نظافة | متغيرة | 30 | مفعلة |

- **Special components**: role-gated categories section, recent expense cards with chips, result card after create/update.

### الجرد

- **Layout pattern**: operational workspace with sections for create, active counts, reconciliation, and history.
- **Key data shown**: open counts, completed counts, recent reconciliations, count type, selected products, actual vs system quantities, difference labels, account reconciliation details.
- **User actions**:
  - `بدء الجرد` -> create a daily/weekly/monthly count session.
  - Select specific products -> reveal searchable product selection panel.
  - Open a count session -> load its editable item lines.
  - Edit actual quantity / reason -> update difference badge live.
  - `إكمال الجرد` -> open confirmation dialog and finalize the count.
  - `تأكيد التسوية` -> reconcile selected account with actual balance.
- **States to show in prototype**: create flow, create result card, no products matched, no open counts, active count filled state, no completed history, reconciliation result state, action error banner.
- **Realistic data**:

  | المنتج | الكمية بالنظام | الكمية الفعلية | الفرق | السبب |
  |---|---|---|---|---|
  | iPhone 13 128GB أزرق | 4 | 3 | -1 | كسر شاشة العرض |
  | شاحن 20W أصلي | 28 | 27 | -1 | سحب عرض |
  | حماية شاشة Nano | 34 | 34 | 0 | مطابق |
  | Galaxy A15 128GB | 9 | 10 | +1 | إدخال متأخر |

  | الحساب | المتوقع | الفعلي | الفرق | التاريخ |
  |---|---|---|---|---|
  | صندوق الفرع الرئيسي | 2,450.000 د.أ | 2,430.000 د.أ | -20.000 د.أ | اليوم |
  | بنك القاهرة عمان | 8,120.000 د.أ | 8,120.000 د.أ | 0.000 د.أ | الأمس |
  | محفظة زين كاش | 540.000 د.أ | 535.000 د.أ | -5.000 د.أ | الأمس |

- **Special components**: selectable count sessions rail, editable inventory line cards, confirmation dialogs for complete/reconcile, difference badges.

### الموردون

- **Layout pattern**: multi-mode supplier workspace with directory/detail, purchase creation, supplier payment, and history.
- **Key data shown**: supplier directory, current balance, phone/address, purchase draft lines, supplier payments, purchase orders history.
- **User actions**:
  - Search/filter suppliers -> refine directory list.
  - Select supplier -> load editable profile into detail form.
  - `مورد جديد` -> clear detail form and switch to create mode.
  - Add product to purchase draft -> append editable purchase line.
  - Toggle `نقدي` vs `على الحساب` -> change payment account logic.
  - Submit purchase -> show purchase result with number and total.
  - Submit supplier payment -> show payment result and new remaining balance.
- **States to show in prototype**: filled directory, no suppliers found, create supplier mode, filled purchase draft, empty purchase draft, payable suppliers state, no payable suppliers, history filled and empty states.
- **Realistic data**:

  | المورد | الهاتف | الرصيد الحالي | الحالة | آخر تحديث |
  |---|---|---|---|---|
  | مؤسسة البرج للأجهزة | 0797001122 | 540.000 د.أ | نشط | 2026-04-04 |
  | الخليج للإكسسوارات | 0788445566 | 0.000 د.أ | نشط | 2026-04-03 |
  | صدى الشرائح | 0779112233 | 120.000 د.أ | نشط | 2026-04-02 |

  | رقم الشراء | المورد | الإجمالي | نوع الدفع | التاريخ |
  |---|---|---|---|---|
  | PUR-24019 | مؤسسة البرج للأجهزة | 1,480.000 د.أ | على الحساب | 2026-04-04 |
  | PUR-24018 | الخليج للإكسسوارات | 220.000 د.أ | نقدي | 2026-04-03 |
  | PUR-24017 | صدى الشرائح | 95.000 د.أ | نقدي | 2026-04-02 |

  | رقم التسديد | المورد | المبلغ | الحساب | التاريخ |
  |---|---|---|---|---|
  | SP-24008 | مؤسسة البرج للأجهزة | 300.000 د.أ | بنك القاهرة عمان | 2026-04-04 |
  | SP-24007 | صدى الشرائح | 80.000 د.أ | صندوق الفرع الرئيسي | 2026-04-03 |
  | SP-24006 | مؤسسة البرج للأجهزة | 120.000 د.أ | محفظة زين كاش | 2026-04-01 |

- **Special components**: supplier directory rail, purchase draft builder, supplier payment projection strip, history cards with nested line items.

### الشحن والتحويلات

- **Layout pattern**: KPI strip + internal sections for new top-up, transfer, and history.
- **Key data shown**: total top-up amount, top-up profit, entry count, provider, account, projected cost, transfer balances, recent top-ups, recent transfers.
- **User actions**:
  - Fill top-up form and submit -> show operation result with top-up number and invoice number.
  - Fill transfer form and submit -> show transfer result and ledger count.
  - Switch to history -> show recent top-up and transfer tables.
  - Retry after failure -> rerun the last failed top-up or transfer.
- **States to show in prototype**: top-up form filled, top-up success, transfer success, non-admin transfer blocked state, empty history tables, in-progress info banner, action error banner.
- **Realistic data**:

  | رقم الشحن | التاريخ | الحساب | المبلغ | الربح | المزود |
  |---|---|---|---|---|---|
  | TOP-24015 | 2026-04-05 | صندوق الفرع الرئيسي | 300.000 د.أ | 9.000 د.أ | زين |
  | TOP-24014 | 2026-04-04 | بنك القاهرة عمان | 500.000 د.أ | 15.000 د.أ | أورنج |
  | TOP-24012 | 2026-04-03 | محفظة زين كاش | 120.000 د.أ | 3.600 د.أ | أمنية |

  | رقم التحويل | التاريخ | من | إلى | المبلغ |
  |---|---|---|---|---|
  | TR-24004 | 2026-04-05 | صندوق الفرع الرئيسي | بنك القاهرة عمان | 400.000 د.أ |
  | TR-24003 | 2026-04-03 | بنك القاهرة عمان | محفظة زين كاش | 150.000 د.أ |
  | TR-24002 | 2026-04-02 | صندوق الفرع الرئيسي | محفظة زين كاش | 60.000 د.أ |

- **Special components**: projected cost strip, projected transfer balance strip, admin-only transfer mode.

### الصيانة الأساسية

- **Layout pattern**: summary cards + internal sections for overview, create job, and job workflow list.
- **Key data shown**: open count, ready count, delivered revenue, maintenance accounts, customer/job details, status, estimated cost, final amount, delivered date.
- **User actions**:
  - Create new job -> save job and show result card with number and status.
  - Move status `new -> in_progress -> ready -> delivered` -> update the same job card.
  - Admin cancel job -> open confirmation dialog and cancel the selected job.
  - Edit final amount/payment account/notes for ready jobs -> then `تسليم وتحصيل`.
- **States to show in prototype**: overview with account balances, create job success, empty jobs list, workflow list with mixed statuses, cancel confirmation, action error banner.
- **Realistic data**:

  | رقم الطلب | العميل | الجهاز | الحالة | التقديري | النهائي |
  |---|---|---|---|---|---|
  | JOB-24014 | ليان سمير | iPhone 11 | جاهز للتسليم | 45.000 د.أ | 55.000 د.أ |
  | JOB-24013 | أحمد الحربي | Galaxy A34 | قيد الصيانة | 18.000 د.أ | 0.000 د.أ |
  | JOB-24011 | شركة الرواد | iPad 9 | جديد | 60.000 د.أ | 0.000 د.أ |
  | JOB-24009 | سمر نادر | iPhone 13 | مسلّم | 35.000 د.أ | 35.000 د.أ |

- **Special components**: status-transition chips per job card, final-amount/payment-account inputs for ready jobs, cancel confirmation dialog.

### التقارير

- **Layout pattern**: analytical long-form page; filters section, comparison KPI band, chart section, baseline KPIs, sales/returns/accounts/maintenance sections.
- **Key data shown**: current period, comparison period, sales delta, profit delta, filters, breakdown table, sales history, snapshots, debt report, low stock, returns reasons, account movements, maintenance revenue.
- **User actions**:
  - Apply filters -> rerender all KPI bands and tables.
  - Reset -> return to default report route.
  - Export Excel -> download report using current filters.
  - Section chips -> jump to anchors inside the long page.
  - Open invoices -> route into `/invoices`.
- **States to show in prototype**: full filled analytical view, comparison empty state, no invoices in filter range, no returns in range, no account movement state.
- **Realistic data**:

  | رقم الفاتورة | التاريخ | الموظف | الجهاز | الحالة | الإجمالي |
  |---|---|---|---|---|---|
  | INV-24051 | 2026-04-05 | نور الرفاعي | POS-01 | نشطة | 189.000 د.أ |
  | INV-24050 | 2026-04-05 | عمر الخطيب | POS-02 | نشطة | 425.500 د.أ |
  | INV-24047 | 2026-04-04 | نور الرفاعي | POS-01 | مرتجع جزئي | 1,120.000 د.أ |
  | INV-24040 | 2026-04-03 | سارة المصري | POS-03 | مرتجعة | 78.000 د.أ |

  | سبب المرتجع | العدد | إجمالي المرتجع |
  |---|---|---|
  | عطل مصنعي | 3 | 210.000 د.أ |
  | استبدال عميل | 2 | 95.000 د.أ |
  | خطأ تسعير | 1 | 12.500 د.أ |

  | الحساب | عدد الحركات | الوارد | الصادر | الرصيد الحالي |
  |---|---|---|---|---|
  | صندوق الفرع الرئيسي | 58 | 5,480.000 د.أ | 2,930.000 د.أ | 2,550.000 د.أ |
  | بنك القاهرة عمان | 24 | 8,200.000 د.أ | 1,120.000 د.أ | 7,080.000 د.أ |
  | محفظة زين كاش | 13 | 910.000 د.أ | 410.000 د.أ | 500.000 د.أ |

- **Special components**: section anchor nav, comparison cards, chart placeholder block, multiple data tables inside one scroll narrative.

### الإعدادات

- **Layout pattern**: settings mega-workspace with internal sections for permissions, snapshot, integrity, reconciliation, inventory completion, and policies.
- **Key data shown**: counts of active assignments/snapshots/open counts, daily snapshot results, integrity drifts, reconciliation form, inventory completion lines, policy summary chips, permissions matrix.
- **User actions**:
  - Switch sections -> swap the visible settings region without leaving `/settings`.
  - `حفظ اللقطة اليومية` -> open confirmation dialog and create snapshot.
  - `إعادة الفحص` -> run balance integrity check.
  - `تأكيد التسوية` -> open confirmation dialog and create reconciliation entry.
  - `إكمال الجرد` -> open confirmation dialog and finalize selected inventory count.
  - Permissions changes -> save bundle/assignment changes inside the embedded permissions panel.
- **States to show in prototype**: snapshot success, no snapshots, integrity clean state, integrity drift state, inventory counts empty state, permissions filled state, policies informational state, action error banner.
- **Realistic data**:

  | تاريخ اللقطة | عدد الفواتير | صافي المبيعات | وقت الإنشاء |
  |---|---|---|---|
  | 2026-04-05 | 42 | 3,250.000 د.أ | اليوم 22:10 |
  | 2026-04-04 | 37 | 2,980.500 د.أ | الأمس 22:05 |
  | 2026-04-03 | 31 | 2,410.000 د.أ | 2026-04-03 22:08 |

  | الحساب | الرصيد المخزن | الرصيد المحسوب | الفرق |
  |---|---|---|---|
  | صندوق الفرع الرئيسي | 2,450.000 د.أ | 2,430.000 د.أ | -20.000 د.أ |
  | بنك القاهرة عمان | 8,120.000 د.أ | 8,120.000 د.أ | 0.000 د.أ |
  | محفظة زين كاش | 540.000 د.أ | 535.000 د.أ | -5.000 د.أ |

- **Special components**: embedded permissions panel, confirmation dialogs, snapshot result card, integrity drift cards, settings section nav.

### النقل والاستيراد والاستعادة

- **Layout pattern**: high-risk configuration workspace with sections for export, import dry run, restore drill, and history.
- **Key data shown**: ready packages count, import jobs count, restore drill count, export form, dry-run result, package history, import history, restore history.
- **User actions**:
  - Create export package -> show result card with expiry note.
  - Select file and run dry run -> show row totals, valid/invalid counts.
  - If dry run is valid -> open confirmation dialog for commit import.
  - Select backup -> open confirmation dialog for restore drill.
  - Download package -> open direct API download.
  - Revoke package -> open confirmation dialog and invalidate the package.
- **States to show in prototype**: export success, no export yet, dry-run success with commit CTA, dry-run invalid rows state, restore success, no backup packages, empty history, action error banner.
- **Realistic data**:

  | اسم الحزمة | النطاق | النوع | عدد السجلات | الحالة |
  |---|---|---|---|---|
  | products-2026-04-05.json | المنتجات | JSON | 148 | جاهزة |
  | reports-week14.csv | التقارير | CSV | 42 | جاهزة |
  | customers-2026-04-04.json | العملاء | JSON | 63 | مبطلة |
  | backup-2026-04-03.json | نسخة احتياطية | JSON | 1,204 | منتهية |

  | الملف | الصفوف الكلية | السليمة | غير السليمة | الحالة |
  |---|---|---|---|---|
  | products-april.csv | 120 | 118 | 2 | الفحص الأولي جاهز |
  | products-fix.json | 64 | 64 | 0 | تم الاستيراد |
  | backup-drill-03 | 1 | 1 | 0 | مكتمل |

- **Special components**: confirmation dialogs for commit/revoke/restore, danger note card, package history cards with download/revoke actions.

### الإيصال العام

- **Layout pattern**: standalone read-only receipt page with hero header + receipt panel + item list.
- **Key data shown**: store name, invoice number, invoice date, total, line items, unit price, read-only notice.
- **User actions**:
  - Open shared URL -> show valid receipt or one of the invalid/revoked/expired states.
  - Browser print -> user prints using browser controls; no custom print button is required.
- **States to show in prototype**: valid receipt, invalid token, revoked token, expired token.
- **Realistic data**:

  | المنتج | الكمية | سعر الوحدة | الإجمالي |
  |---|---|---|---|
  | iPhone 13 128GB أزرق | 1 | 315.000 د.أ | 315.000 د.أ |
  | شاحن 20W أصلي | 2 | 12.500 د.أ | 25.000 د.أ |
  | حماية شاشة Nano | 1 | 6.000 د.أ | 6.000 د.أ |

- **Special components**: standalone read-only hero, invalid/revoked/expired fallback surface.

### جهاز غير مدعوم

- **Layout pattern**: centered informational panel.
- **Key data shown**: eyebrow, unsupported browser/device title, short compatibility explanation.
- **User actions**: no complex action; optionally add one secondary CTA back to login in the prototype.
- **States to show in prototype**: default informational state only.
- **Realistic data**: no table; use example unsupported environments such as `Chrome 88`, `Android WebView قديم`, `iPad Safari قديم`.
- **Special components**: narrow informational panel, device-compatibility copy block.

### تنظيف الكاش المحلي

- **Layout pattern**: compact auth-style utility card with live status text.
- **Key data shown**: title, explanation, live reset status message, manual back-to-login link.
- **User actions**:
  - Page load -> automatically runs the reset script and changes status text.
  - Success -> auto-redirect to `/login?fresh=...`.
  - Failure -> keep the page visible and show manual recovery message.
  - `العودة يدويًا إلى تسجيل الدخول` -> immediate manual route change.
- **States to show in prototype**: preparing state, cleaning state, success state, failure state.
- **Realistic data**: no table; use status messages exactly as short operational strings.
- **Special components**: inline live status line, scripted auto-redirect state.

### شاشة التحميل العامة

- **Layout pattern**: shell skeleton with sidebar placeholder and content placeholders.
- **Key data shown**: no real data; only skeleton lines, cards, and shell framing.
- **User actions**: none.
- **States to show in prototype**: loading only.
- **Realistic data**: no table; use 5 navigation skeleton lines, 1 large title skeleton, 3 card skeletons.
- **Special components**: shell-level skeleton surfaces.

### شاشة الخطأ العامة

- **Layout pattern**: centered error panel inside the shell.
- **Key data shown**: danger icon, title, short description, retry button.
- **User actions**:
  - `إعادة المحاولة` -> return to the previous attempted screen and dismiss the error when successful.
- **States to show in prototype**: error only.
- **Realistic data**: no table; use one representative message about failing to load the current workspace.
- **Special components**: danger empty panel with retry CTA.

### الوصول غير المصرح به

- **Layout pattern**: hero + empty panel with two actions.
- **Key data shown**: missing-access title, explanation, primary recovery action, secondary go-home action.
- **User actions**:
  - Primary action -> route to login or another safe route.
  - Secondary action -> route to the home page.
- **States to show in prototype**: unauthenticated version, forbidden version, POS-specific version.
- **Realistic data**: no table; use example titles such as `هذه الشاشة تتطلب صلاحية إدارية` and `يلزم تسجيل الدخول أولًا`.
- **Special components**: workspace hero + centered empty panel + action row.

### هيكل التنقل العام

- **Layout pattern**: persistent shell with topbar, nav popover, main content area, and mobile bottom bar.
- **Key data shown**: current page title, menu trigger, search trigger, notifications trigger, account chip, grouped nav links, unread badge.
- **User actions**:
  - Menu trigger -> open popover or mobile bottom sheet nav.
  - Backdrop click -> close popover and return focus to trigger.
  - Nav item click -> route to selected screen and close the popover.
  - Search icon -> route to `/search`.
  - Notifications icon -> route to `/notifications`.
  - Account/logout -> show user info and trigger logout path.
- **States to show in prototype**: desktop dropdown nav open, mobile bottom-sheet nav open, unread badge visible, offline shell modifier, access-required shell handoff.
- **Realistic data**:

  | المجموعة | الرابط | التسمية | ملاحظة |
  |---|---|---|---|
  | daily | `/pos` | نقطة البيع | عنصر bottom bar |
  | daily | `/notifications` | الإشعارات | يحمل badge |
  | operations | `/inventory` | الجرد | عنصر bottom bar |
  | management | `/reports` | التقارير | إدارة فقط |

- **Special components**: nav popover, mobile bottom bar, account chip, unread badge, shell title strip.

## Section 4 - Shared Components

### Stat Card

- Use the current preview card species exactly: flat white or near-white surface, 1px border, modest rounding, no heavy chrome.
- Title line is small and muted.
- Value line is the dominant number or status in the card.
- Use the existing preview typography stack exactly as it is already loaded: Tajawal for UI copy and the current preview numeric emphasis where already present.
- Keep max 4 summary cards per row before wrapping or regrouping.
- For operational screens, stat cards should summarize one number only, not mixed narrative copy.

### Data Table

- Keep the existing `table-wrap` / `data-table` visual pattern.
- Header row: muted surface, semibold labels, compact vertical padding.
- Body rows: white background, thin separators only, no zebra striping.
- Empty row: centered helper text inside the same table shell.
- Row badges: keep the current semantic badge colors already used in the preview.
- Any mixed Arabic with invoice numbers, SKUs, or phone numbers should stay visually readable and must use `bdi` in the real implementation.

### Empty State

- One icon at approximately 18-20px.
- One short Arabic heading.
- One short supporting sentence at most.
- One obvious next-step CTA when a recovery action exists.
- Keep empty states inside the same surface where the content would have appeared; do not jump to a full-page blank layout unless the whole route is blocked.

### Action Buttons

- `primary-button`: solid accent fill, white text, 44px minimum height, used for one dominant task only.
- `secondary-button`: white or muted surface with border, used for route changes, resets, and non-destructive confirmations.
- `ghost-button` or chip-style controls: used for low-emphasis mode switching and utility actions.
- Danger actions should keep the existing class contracts already used in the preview and be visually distinct from save/confirm.
- Never place two equally strong primary buttons in the same small region.

### Search Bar

- Search field is always accompanied by a leading icon.
- Minimum height 44px.
- Use short Arabic placeholders, not descriptive paragraphs.
- Search reset should live beside the field or in the same filter card, not as a distant action.
- For search-heavy screens, keep results visible while typing instead of replacing the whole layout.

### Form Fields

- Labels stay above inputs or selects.
- Inputs and selects follow the same height, border, and radius system as the preview.
- Textareas default to 3 rows for operational forms.
- Validation must keep user input visible.
- Checkbox rows must keep label text aligned and readable in RTL.

### Status Badges

- Neutral: count, role, informational metadata.
- Brand/info: active selection or branded context.
- Success: completed, delivered, paid, healthy.
- Warning: debt, low stock, pending, difference detected.
- Danger: returned, cancelled, invalid, revoked, blocked failure.
- Keep badge text short, single-line, and paired with context when needed.

## Section 5 - Prototype Architecture Recommendation

### 5.1 Single HTML Strategy

- Keep one HTML file with a persistent shell and JS-driven screen switching.
- Use a screen registry object such as:
  - `SCREENS = { home, pos, products, invoices, invoiceDetail, debts, notifications, search, expenses, inventory, suppliers, operations, maintenance, reports, settings, portability, publicReceipt, unsupportedDevice, resetCache, loading, error, accessRequired }`
- Represent route changes in JS with a `currentRoute` string and optional `routeParams`.
- Map nav clicks, list row clicks, and action buttons to route mutations, then call one renderer for the visible screen.

### 5.2 Shared Data Store

- Create one shared mock data store and reuse it across screens so relationships stay believable.
- Reuse the same invoice records in home, invoices list, invoice detail, public receipt, notifications, and reports.
- Reuse the same customers in POS, debts, search, and notifications.
- Reuse the same products in POS, products, inventory, suppliers purchase flow, and reports low stock.

### 5.3 DOM Organization

- Keep the current preview shell classes and extend them instead of replacing them.
- Recommended structure:
  - shell container
  - topbar
  - nav popover layer
  - main screen viewport
  - optional mobile bottom bar
  - global overlays layer for confirmation dialogs, cart sheet, success toast simulation
- Each route should be one screen section with a stable `data-screen` attribute.
- Toggle screens with `hidden`/`aria-hidden` plus one `is-active` class; do not rebuild the whole DOM on every click.

### 5.4 CSS Strategy

- Keep the existing root tokens and class names from `design-preview.html` exactly.
- Add new CSS beside the same naming family instead of inventing a second visual system.
- Create shared utility blocks for operational page headers, chip rows, section cards, list cards, form stacks, result cards, and confirmation dialogs.
- Do not rename the current preview classes and do not split styles into conflicting duplicates.

### 5.5 Screen State Coverage

- Show these screens in filled state by default: home, POS, products, invoices, invoice detail, debts, inventory, reports.
- Also implement alternate states for interaction demos: notifications empty inbox, search no-results, expenses empty recent list, suppliers no search results, maintenance empty jobs, portability dry-run success, settings integrity drift, public receipt invalid/revoked/expired, shell loading/error/access-required.

### 5.6 Interaction Model

- Use small JS state machines, not arbitrary DOM mutations.
- Examples:
  - POS cart: `cart -> processing -> success`
  - shell nav: `closed -> dropdown open` or `sheet open`
  - invoice detail: `overview / returns / admin`
  - notifications: `inbox / alerts / search`
  - settings: `permissions / snapshot / integrity / reconciliation / inventory / policies`
- Confirmation dialogs should be reusable and receive title, description, confirm label, cancel label, and tone.

### 5.7 Order of Implementation

1. Preserve and stabilize the current shell, topbar, nav popover, bottom bar, and shared tokens/classes.
2. Build the core operational routes: home, POS, products, invoices, invoice detail, debts, inventory.
3. Add cross-linking flows: public receipt, notifications, global search.
4. Build operational management routes: expenses, suppliers, operations, maintenance.
5. Build reports and settings.
6. Add portability and utility/fallback routes.
7. Add alternate states, confirmations, and route-preserving transitions.

## Section 6 - What NOT to Change

- Preserve the existing root token names from `design-preview.html` exactly:
  - `--bg`
  - `--card-bg`
  - `--muted-bg`
  - `--border`
  - `--text-pri`
  - `--text-sec`
  - `--accent`
  - `--accent-hover`
  - `--accent-light`
  - `--success`
  - `--success-bg`
  - `--danger`
  - `--danger-bg`
  - `--warning`
  - `--warning-bg`
  - `--radius-sm`
  - `--radius-md`
  - `--radius-lg`
- Preserve the current preview typography stack exactly as it is already loaded in the HTML prototype:
  - Tajawal remains the main UI typeface.
  - The existing preview numeric/metric emphasis behavior should stay visually unchanged.
- Preserve the existing POS split layout logic from the preview:
  - `pos-layout`
  - `pos-grid-area`
  - `pos-cart-area`
  - current desktop split proportions and mobile bottom-bar behavior
- Preserve the existing class contracts already present in the preview. Extend them; do not rename or remove them. This includes shell, tab, panel, badge, table, search, POS, and bottom-bar classes.
- Preserve the current top header pattern:
  - centered title
  - tabs in the same top bar
  - left/right action clusters
- Preserve the current badge palette and semantic meaning already visible in the preview.
- Preserve the current table shell style and the current card family. New screens should feel like they were built from the same file, not like a second prototype was stitched in later.
- Preserve current RTL direction, spacing rhythm, and mobile-first assumptions from the preview.
- If a real-code screen conflicts with the current preview styling, keep the preview styling for the HTML prototype and document the mismatch only in Section 7. Do not silently redesign the visual language mid-file.

## Section 7 - Issues Found Per Screen

### تسجيل الدخول — Issues
| # | Severity (high/medium/low) | Problem | Location (component:line if visible) | DS Rule Violated |
|---|----------------------------|---------|---------------------------------------|-----------------|
| 1 | low | The right-side brand column carries a long product paragraph for a login-first task, so the supporting copy is heavier than the primary action. | `components/auth/login-entry-page.tsx` | — |

**Information Hierarchy Rating**: Clear - the form remains dominant, but the marketing-style side copy should stay subordinate.

### ملخص التشغيل اليومي — Issues
| # | Severity (high/medium/low) | Problem | Location (component:line if visible) | DS Rule Violated |
|---|----------------------------|---------|---------------------------------------|-----------------|
| 1 | medium | The screen is operationally useful but thin; it shows alerts and recent invoices without enough scope context for managers who need a broader first-glance summary. | `components/dashboard/dashboard-home.tsx` | — |
| 2 | low | The screen depends on linked modules for most follow-up actions, so the prototype should visibly indicate that cards are jump points rather than static summaries. | `components/dashboard/dashboard-home.tsx` | — |

**Information Hierarchy Rating**: Clear - the page purpose is obvious, but the summary story is narrower than the rest of the system.

### نقطة البيع — Issues
| # | Severity (high/medium/low) | Problem | Location (component:line if visible) | DS Rule Violated |
|---|----------------------------|---------|---------------------------------------|-----------------|
| 1 | high | Validation tone classes use hardcoded emerald/amber/destructive utility colors instead of shared design tokens. | `components/pos/pos-workspace.tsx:199` | DS-RULE-01 |
| 2 | medium | The screen exposes held carts, split payments, customer search, discounts, mobile tabs, and recovery banners in one flow; this is correct functionally but easy to overcrowd in the prototype if hierarchy is weak. | `components/pos/pos-workspace.tsx` | — |

**Information Hierarchy Rating**: Clear - despite the density, products and cart remain the obvious first focus.

### المنتجات — Issues
| # | Severity (high/medium/low) | Problem | Location (component:line if visible) | DS Rule Violated |
|---|----------------------------|---------|---------------------------------------|-----------------|
| 1 | medium | In admin mode, the entire product card is clickable while it also contains explicit `تحرير` and `تعطيل` buttons, which creates redundant hit targets and accidental-edit risk. | `components/pos/products-browser.tsx` | — |
| 2 | medium | The admin form and the browsing grid share the same page and can compete visually on narrower widths if the prototype does not clearly subordinate the form. | `components/pos/products-browser.tsx` | — |

**Information Hierarchy Rating**: Clear - the screen can stay readable if the grid remains primary and the admin form stays secondary.

### الفواتير — Issues
| # | Severity (high/medium/low) | Problem | Location (component:line if visible) | DS Rule Violated |
|---|----------------------------|---------|---------------------------------------|-----------------|
| 1 | medium | The list supports search and sort only; it does not expose status/date/account filters, so the management view is lighter than the underlying business need. | `components/dashboard/invoices-workspace.tsx` | — |
| 2 | low | Invoice rows are browse-only and require opening the detail screen for all follow-up work, so the prototype should reflect that intentionally rather than feeling unfinished. | `components/dashboard/invoices-workspace.tsx` | — |

**Information Hierarchy Rating**: Clear - the list is easy to scan, but secondary filtering depth is limited.

### تفاصيل الفاتورة — Issues
| # | Severity (high/medium/low) | Problem | Location (component:line if visible) | DS Rule Violated |
|---|----------------------------|---------|---------------------------------------|-----------------|
| 1 | high | Sharing, public receipt management, returns, and destructive admin cancel all live in the same secondary action column, which can make the page feel action-heavy for one invoice. | `components/dashboard/invoice-detail.tsx` | — |
| 2 | medium | The returns workflow renders all returnable items as a repeated quantity-input list, which becomes long and hard to scan for larger invoices. | `components/dashboard/invoice-detail.tsx` | — |

**Information Hierarchy Rating**: Cluttered - the invoice summary is clear, but too many important actions compete in the side rail.

### الديون — Issues
| # | Severity (high/medium/low) | Problem | Location (component:line if visible) | DS Rule Violated |
|---|----------------------------|---------|---------------------------------------|-----------------|
| 1 | medium | Ledger review, manual debt creation, and payment capture all live on one screen, so vertical length grows quickly after a customer is selected. | `components/dashboard/debts-workspace.tsx` | — |
| 2 | medium | There is no explicit aging bucket or overdue grouping beyond due dates, which weakens prioritization for high-volume debt follow-up. | `components/dashboard/debts-workspace.tsx` | — |

**Information Hierarchy Rating**: Clear - the selected customer anchor is strong, but collection prioritization could be sharper.

### الإشعارات — Issues
| # | Severity (high/medium/low) | Problem | Location (component:line if visible) | DS Rule Violated |
|---|----------------------------|---------|---------------------------------------|-----------------|
| 1 | medium | Inbox, alerts summary, and global search are combined into one workspace, which raises mode complexity and increases the chance of a crowded prototype. | `components/dashboard/notifications-workspace.tsx` | — |
| 2 | medium | The screen duplicates part of the dedicated global search experience instead of acting as a pure notifications center. | `components/dashboard/notifications-workspace.tsx` | — |

**Information Hierarchy Rating**: Cluttered - the modes are useful but too broad for one center without careful visual separation.

### البحث الشامل — Issues
| # | Severity (high/medium/low) | Problem | Location (component:line if visible) | DS Rule Violated |
|---|----------------------------|---------|---------------------------------------|-----------------|
| 1 | low | Result cards are intentionally generic and may hide important fields such as status, balance, or urgency unless the prototype enriches the secondary line. | `components/dashboard/search-workspace.tsx` | — |
| 2 | low | The initial and no-results states are minimal and need a stronger visual cue that the user is still inside a cross-module search tool. | `components/dashboard/search-workspace.tsx` | — |

**Information Hierarchy Rating**: Clear - the search result grouping is straightforward, but the cards need richer secondary context.

### المصروفات — Issues
| # | Severity (high/medium/low) | Problem | Location (component:line if visible) | DS Rule Violated |
|---|----------------------------|---------|---------------------------------------|-----------------|
| 1 | medium | Category management becomes a long series of inline editable cards with no filter, search, or grouping, which will scale poorly. | `components/dashboard/expenses-workspace.tsx` | — |
| 2 | low | The `create`, `recent`, and `categories` tabs split related context apart; a user cannot see form and category governance together without switching mode. | `components/dashboard/expenses-workspace.tsx` | — |

**Information Hierarchy Rating**: Clear - the create flow is readable, but the admin maintenance mode is list-heavy.

### الجرد — Issues
| # | Severity (high/medium/low) | Problem | Location (component:line if visible) | DS Rule Violated |
|---|----------------------------|---------|---------------------------------------|-----------------|
| 1 | high | Account reconciliation appears here and also inside Settings, which duplicates ownership and weakens information architecture across the product. | `components/dashboard/inventory-workspace.tsx`, `components/dashboard/settings-ops.tsx` | — |
| 2 | medium | Active count detail becomes a long wall of editable item cards with no category grouping, summary collapsing, or progressive disclosure. | `components/dashboard/inventory-workspace.tsx` | — |

**Information Hierarchy Rating**: Cluttered - the create/active/history structure is understandable, but the editable count detail can become visually heavy fast.

### الموردون — Issues
| # | Severity (high/medium/low) | Problem | Location (component:line if visible) | DS Rule Violated |
|---|----------------------------|---------|---------------------------------------|-----------------|
| 1 | high | Directory, supplier form, purchase builder, payment flow, and history are bundled into one workspace, which makes the module broad and mode-heavy. | `components/dashboard/suppliers-workspace.tsx` | — |
| 2 | medium | Purchase creation uses a long vertical flow with inline line-item editing and no persistent summary rail, which can feel cumbersome for large orders. | `components/dashboard/suppliers-workspace.tsx` | — |

**Information Hierarchy Rating**: Cluttered - each sub-flow makes sense, but the module scope is wider than a single calm screen.

### الشحن والتحويلات — Issues
| # | Severity (high/medium/low) | Problem | Location (component:line if visible) | DS Rule Violated |
|---|----------------------------|---------|---------------------------------------|-----------------|
| 1 | medium | Historical context disappears when the user is in `شحن جديد` or `تحويل داخلي`, so the module forces more mode switching than necessary. | `components/dashboard/operations-workspace.tsx` | — |
| 2 | low | The non-admin transfer section resolves into a blocked empty treatment inside the same page, which can feel like dead space if not explicitly labeled in the prototype. | `components/dashboard/operations-workspace.tsx` | — |

**Information Hierarchy Rating**: Clear - top-up and transfer forms each have a strong anchor, but history becomes secondary too abruptly.

### الصيانة الأساسية — Issues
| # | Severity (high/medium/low) | Problem | Location (component:line if visible) | DS Rule Violated |
|---|----------------------------|---------|---------------------------------------|-----------------|
| 1 | high | Each job card can contain notes, amount fields, payment account selection, status actions, and cancel controls, making the workflow list heavy and repetitive. | `components/dashboard/maintenance-workspace.tsx` | — |
| 2 | medium | There is no built-in search or filtering for long job lists, even though maintenance naturally needs queue triage. | `components/dashboard/maintenance-workspace.tsx` | — |

**Information Hierarchy Rating**: Cluttered - the main workflow is understandable, but repeated editable job cards can quickly overload the page.

### التقارير — Issues
| # | Severity (high/medium/low) | Problem | Location (component:line if visible) | DS Rule Violated |
|---|----------------------------|---------|---------------------------------------|-----------------|
| 1 | high | The page stacks filters, multiple KPI bands, charts, lists, and tables in one long route, so many surfaces compete for attention. | `components/dashboard/reports-overview.tsx` | — |
| 2 | medium | The filter region is large and can overshadow the actual decision story if the prototype does not aggressively subordinate it after submission. | `components/dashboard/reports-overview.tsx` | — |

**Information Hierarchy Rating**: Cluttered - the screen is information-rich, but too many analytical regions compete without strong compression.

### الإعدادات — Issues
| # | Severity (high/medium/low) | Problem | Location (component:line if visible) | DS Rule Violated |
|---|----------------------------|---------|---------------------------------------|-----------------|
| 1 | high | Permissions, snapshots, integrity checks, reconciliation, inventory completion, and policies all live in one settings workspace, which is too broad for a calm admin IA. | `components/dashboard/settings-ops.tsx` | — |
| 2 | high | Inventory completion is duplicated inside Settings even though Inventory already owns that workflow. | `components/dashboard/settings-ops.tsx`, `components/dashboard/inventory-workspace.tsx` | — |

**Information Hierarchy Rating**: Confusing - the screen mixes governance, finance integrity, and inventory execution in one place.

### النقل والاستيراد والاستعادة — Issues
| # | Severity (high/medium/low) | Problem | Location (component:line if visible) | DS Rule Violated |
|---|----------------------------|---------|---------------------------------------|-----------------|
| 1 | high | Export, import, restore drills, and revoke actions all share one workspace even though they are high-risk operations with different mental models. | `components/dashboard/portability-workspace.tsx` | — |
| 2 | medium | History cards summarize import and restore results, but they do not surface detailed validation errors or drift explanations inline. | `components/dashboard/portability-workspace.tsx` | — |

**Information Hierarchy Rating**: Confusing - the actions are individually clear, but the module combines too many risky jobs in one frame.

### الإيصال العام — Issues
| # | Severity (high/medium/low) | Problem | Location (component:line if visible) | DS Rule Violated |
|---|----------------------------|---------|---------------------------------------|-----------------|
| 1 | low | The valid receipt view is intentionally sparse and does not expose store contact, return policy, or a branded footer that could improve trust. | `app/r/[token]/page.tsx` | — |
| 2 | low | Invalid, revoked, and expired states reuse the same danger-surface pattern, so the nuance between them depends entirely on copy. | `app/r/[token]/page.tsx` | — |

**Information Hierarchy Rating**: Clear - the receipt is simple and readable, but its fallback states are visually similar.

### جهاز غير مدعوم — Issues
| # | Severity (high/medium/low) | Problem | Location (component:line if visible) | DS Rule Violated |
|---|----------------------------|---------|---------------------------------------|-----------------|
| 1 | medium | The page explains the compatibility problem but offers no explicit recovery link, browser list CTA, or support route. | `app/unsupported-device/page.tsx` | — |

**Information Hierarchy Rating**: Clear - the message is understandable immediately, but the recovery path is weak.

### تنظيف الكاش المحلي — Issues
| # | Severity (high/medium/low) | Problem | Location (component:line if visible) | DS Rule Violated |
|---|----------------------------|---------|---------------------------------------|-----------------|
| 1 | medium | Automatic redirect after a short delay may move too quickly for users who want to read the status outcome before leaving the page. | `app/reset-cache/page.tsx` | — |
| 2 | low | The page depends on status text only; it does not use a stronger success or failure visual treatment. | `app/reset-cache/page.tsx` | — |

**Information Hierarchy Rating**: Clear - the utility is simple, but the success state could be more deliberate.

### شاشة التحميل العامة — Issues
| # | Severity (high/medium/low) | Problem | Location (component:line if visible) | DS Rule Violated |
|---|----------------------------|---------|---------------------------------------|-----------------|
| 1 | high | The loading skeleton still renders a sidebar placeholder even though the actual shell has moved to a topbar + popover navigation model, so the loading IA no longer matches the product. | `app/(dashboard)/loading.tsx` | DS-RULE-08 |

**Information Hierarchy Rating**: Confusing - the skeleton suggests an outdated shell structure that no longer exists.

### شاشة الخطأ العامة — Issues
| # | Severity (high/medium/low) | Problem | Location (component:line if visible) | DS Rule Violated |
|---|----------------------------|---------|---------------------------------------|-----------------|
| 1 | low | The error surface is clear but removes all local page context, so recovery is generic rather than screen-specific. | `app/(dashboard)/error.tsx` | — |

**Information Hierarchy Rating**: Clear - it is obvious what failed and what to do next, even though context is minimal.

### الوصول غير المصرح به — Issues
| # | Severity (high/medium/low) | Problem | Location (component:line if visible) | DS Rule Violated |
|---|----------------------------|---------|---------------------------------------|-----------------|
| 1 | low | The fallback is generic and does not name the missing permission bundle, role, or policy reason in a precise way. | `components/dashboard/access-required.tsx`, `components/pos/access-required.tsx` | — |

**Information Hierarchy Rating**: Clear - the blocker and next action are understandable, but the message can be more specific.

### هيكل التنقل العام — Issues
| # | Severity (high/medium/low) | Problem | Location (component:line if visible) | DS Rule Violated |
|---|----------------------------|---------|---------------------------------------|-----------------|
| 1 | medium | Menu, title, search, notifications, and account controls all live in one topbar, so tablet widths are vulnerable to compression if spacing is not tightly managed. | `components/dashboard/dashboard-shell.tsx` | — |
| 2 | medium | The nav popover is modeled as a dialog-like surface and needs careful focus management in the prototype so it does not feel like a visual-only overlay. | `components/dashboard/dashboard-shell.tsx` | — |

**Information Hierarchy Rating**: Clear - the shell is recognizable and fast, but its utility density requires disciplined spacing and overlay behavior.
