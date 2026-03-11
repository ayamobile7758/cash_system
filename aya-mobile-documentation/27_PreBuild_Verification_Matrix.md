# آية موبايل - مصفوفة التحقق قبل البناء
## 27) Pre-Build Verification Matrix (Go/No-Go)

---

## الهدف

مرجع واحد لتقييم الجاهزية قبل بدء التطوير الفعلي، مع شروط حاسمة لاتخاذ قرار Go أو No-Go.

---

## مقياس الحالة

| الحالة | المعنى |
|--------|--------|
| `Pass` | تحقق الشرط بالكامل |
| `Fail` | الشرط غير متحقق |
| `Blocked` | لا يمكن التحقق بسبب نقص مدخلات |
| `Planned` | بند مضاف لمرحلة مستقبلية ولم يبدأ التحقق منه بعد |

---

## المصفوفة

| ID | المحور | الفحص | المرجع | آلية التحقق | معيار النجاح | الخطورة إذا فشل | الحالة |
|----|--------|-------|--------|-------------|--------------|-----------------|--------|
| `VB-01` | Architecture | كل عمليات الكتابة عبر API فقط | `10_ADRs`, `13`, `05` | مراجعة نصية + Contract Review | لا يوجد مسار كتابة مباشر من Browser | Blocker | Pass |
| `VB-02` | Security | Revoke-All-First مطبق توثيقيًا | `10_ADRs`, `05` | مراجعة SQL Policy | `REVOKE ALL` + RLS موثقين بوضوح | Blocker | Pass |
| `VB-03` | Security | Blind POS محكوم على مستوى البيانات | `05`, `13`, `18` | مراجعة Views/RLS Docs | عدم كشف `cost_price/current_balance/credit_limit` للـ POS | Blocker | Pass |
| `VB-04` | Concurrency | وجود `SELECT FOR UPDATE` + lock ordering + retry | `04`, `13`, `17` | مراجعة تدفق + UAT Cases | UAT-21/UAT-21b معرفان بوضوح | Critical | Pass |
| `VB-05` | Financial | معادلات التوازن الأساسية مغلقة | `04`, `06` | Dry Run Design Review | `payments + debt = total` دائمًا | Blocker | Pass |
| `VB-06` | Financial | دين FIFO موثق بدون غموض | `04`, `06`, `15` | مراجعة Signatures + Flows | وجود `debt_payment_allocations` وقاعدة FIFO | Critical | Pass |
| `VB-07` | Financial | المرتجع الجزئي/الدين مغطى بقواعد صريحة | `04`, `15`, `16` | مراجعة حالات خاصة | شرط `refund_account_id` عند `cash_refund > 0` | Critical | Pass |
| `VB-08` | API | تغطية DB ↔ RPC ↔ Route مكتملة | `13`, `15`, `25` | Matrix Cross-check | كل عملية كتابة لها Route + Contract | Blocker | Pass |
| `VB-09` | API | عقود JSON واضحة لجميع المسارات الحرجة | `25` | Manual Review | Request/Response/Error/Role موثقة | High | Pass |
| `VB-10` | Error Handling | تغطية ERR codes مرتبطة بالعمليات | `16`, `05` | Coverage Review | لا عملية كتابة بدون أخطاء موثقة | High | Pass |
| `VB-11` | Performance | أهداف p95 معرفة قبل التنفيذ | `13`, `17` | Target Review | `create_sale <=2s`, `search <=400ms` | High | Pass |
| `VB-12` | Implementation | وجود Playbook تنفيذي لمطور AI-first | `24` | Content Review | خطوات + أوامر + مخرجات + قبول | High | Pass |
| `VB-13` | Readiness | وجود Dry Run مالي تنفيذي | `26` | Scenario Review | 5 سيناريوهات حرجة مع معايير نجاح | High | Pass |
| `VB-14` | Governance | Tracker محدث بعد كل تنفيذ | `23` | Execution Log Review | كل مهمة لها حالة وسجل تعديل | High | Pass |
| `VB-15` | Device | توافق تشغيل كامل على الهاتف/التابلت/اللابتوب | `13`, `03`, `11`, `17` | مراجعة السياسة + UAT Device | نجاح UAT-33 بدون فقد وظائف | Blocker | Pass |
| `VB-16` | Device UX | جودة التفاعل باللمس وعدم كسر التخطيط | `03`, `11`, `17` | مراجعة معايير UX + UAT-34 | لا Overflow عند 360px + touch targets سليمة | Critical | Pass |
| `VB-17` | Installability | دعم تثبيت Web App على الأجهزة | `13`, `17` | UAT-35 + مراجعة metadata/manifest | يمكن تثبيت التطبيق وتشغيله بنفس الصلاحيات | High | Pass |

---

## امتدادات V2 / ما بعد `PX-07` (Planned Gates)

| ID | المحور | الفحص | المرجع | آلية التحقق | معيار النجاح | الخطورة إذا فشل | الحالة |
|----|--------|-------|--------|-------------|--------------|-----------------|--------|
| `VB-18` | Financial | طبقة المصروفات أصبحت authority كاملة وليست carried-forward gap | `09`, `15`, `16`, `25` | Contract Review + runtime proof | `create_expense` يعمل عبر API ويؤثر على snapshot/profit | Blocker | Pass |
| `VB-19` | Privacy | روابط الإيصالات العامة محكومة token/revocation/expiry | `18`, `25`, `17` | Link privacy review + UAT-39 | لا كشف لأي بيانات داخلية في public receipt | Blocker | Pass |
| `VB-20` | Communication | reminders وWhatsApp محكومة dedupe + delivery audit | `18`, `25`, `17` | Scheduler/log review + UAT-40/41 | لا spam ولا silent failure | High | Pass |
| `VB-21` | Authorization | role expansion لا يفتح privilege escalation أو shadow paths | `10`, `13`, `25`, `17` | Role matrix review + regression UAT | bundles والأدوار الجديدة لا تكسر Blind POS | Blocker | Pass |
| `VB-22` | Reporting | advanced reports + export parity صحيحة ماليًا | `03`, `25`, `17` | Compare/export review + proof scripts | totals في UI/export = `ledger/snapshots/expenses` | Critical | Pass |
| `VB-23` | Portability | export/import/restore محكوم بخصوصية وتدقيق واستعادة معزولة | `18`, `25`, `17` | Package review + restore drill | لا restore على البيئة الأساسية + `drift = 0` بعد drill | Blocker | Pass |
| `VB-24` | Performance | caching والبحث لا يخلقان stale finance أو تجاوزات p95 | `13`, `17`, `27` | Perf review + UAT-49 | search/report p95 ضمن الهدف | High | Pass |
| `VB-25` | Operations | alert aggregation تحسن الإشارة دون فقدان التنبيهات الحرجة | `03`, `17`, `18` | UAT-50 + manual review | dedupe صحيح وcoverage كامل للتنبيهات الحرجة | High | Pass |
| `VB-26` | Device Regression | التحسينات لا تكسر الهاتف/التابلت/اللابتوب بعد V2 | `17`, `29` | UAT-51 | no overflow / no workflow regression | Critical | Pass |

---

## شروط Go/No-Go

### Go (يسمح بالبدء الفعلي في الكود)
1. كل عناصر `Blocker` = `Pass`.
2. لا يوجد `Fail` في عناصر `Critical`.
3. عناصر `High` الفاشلة لا تتجاوز 1 بند مع خطة إغلاق محددة.
4. عناصر الأجهزة `VB-15` و`VB-16` = `Pass` (Gate-D).

### No-Go (إيقاف البدء)
1. فشل أي بند `Blocker`.
2. فشل بندين أو أكثر من `Critical`.
3. غياب عقود API أو غياب Playbook التنفيذ.
4. فشل أي بند من بوابة الأجهزة (Gate-D).

### Go لـ V2 (Release Gate لاحق)
1. `VB-18`, `VB-19`, `VB-21`, `VB-23` = `Pass`.
2. لا يوجد `Fail` في `VB-22` أو `VB-26`.
3. `VB-20`, `VB-24`, `VB-25` قد تبقى `High` فقط إذا وُجدت خطة إغلاق صريحة ومُعتمدة، لكن لا يجوز أن تكون `Fail` بدون remediation.
4. لا توجد finding `P0/P1` مفتوحة في audit الخصوصية أو الصلاحيات أو portability.

### No-Go لـ V2
1. أي `Fail` في `VB-18`, `VB-19`, `VB-21`, أو `VB-23`.
2. أي privacy leak في public receipt links أو packages المحمولة.
3. أي privilege escalation أو shadow write/read path جديد بعد role expansion.
4. فشل restore drill أو بقاء `drift > 0` بعده.

---

## ترتيب التنفيذ العملي قبل أول Sprint

1. راجع `31_Execution_Live_Tracker.md`.
2. نفذ `26_Dry_Run_Financial_Scenarios.md` على الورق/البيئة التجريبية.
3. راجع `25_API_Contracts.md` مع أي مولد AI قبل إنتاج الكود.
4. اعتمد `24_AI_Build_Playbook.md` كخطة تشغيل الفريق.
5. نفّذ UAT الأجهزة (`UAT-33..35`) واعتمد نتائجها.
6. حدّث هذه المصفوفة إلى الحالة النهائية وقرر Go/No-Go.

---

## Gate Package (Authority Locks) - Pre-Execution

| Gate ID | Lock | Required Proofs (Documentation) | Status |
|---------|------|----------------------------------|--------|
| `GP-01` | `LOCK-NoBackdate` | تطابق `ADR-034` + `01` + `04` + `08` + `15` على قاعدة `CURRENT_DATE` فقط وغياب أي سماح بتاريخ سابق | Pass |
| `GP-02` | `LOCK-DriftAuthority` | اسم واحد فقط: `fn_verify_balance_integrity()` + route admin/cron canonical + alias list deprecated | Pass |
| `GP-03` | `LOCK-Suppliers-RLS` | عقد وصول موحد في `05` و`18`: لا direct table read على `suppliers` من `authenticated` (Admin/POS). Admin عبر `admin_suppliers` View/API وPOS عبر API limited fields | Pass |
| `GP-04` | `LOCK-IdempotencyAuthority` | جدول سياسة idempotency موحد بين `05/10/13/15/16/25` مع `create_debt_manual` required و`create_daily_snapshot` natural-key | Pass |
| `GP-05` | `LOCK-DeviceContract` | عقد موحد عبر `29` ومرجعه في `01/11/13/22/README` (phone/tablet/laptop/desktop + installability scope) | Pass |
| `GP-06` | Governance Traceability | وجود سجلات الإغلاق التاريخية في `../archive/2026-03-07/aya-mobile-documentation/23_Documentation_Remediation_Tracker.md` لكل `V-01..V-05` | Pass |
| `GP-07` | Remediation Artifact | وجود ملف حزمة الإغلاق النهائي التاريخي `../archive/2026-03-07/aya-mobile-documentation/30_Documentation_Governance_Remediation_Package.md` | Pass |
| `GP-08` | `LOCK-SINGLE-BRANCH` | Single-Branch is authoritative in MVP; `daily_snapshots` natural key is `UNIQUE(snapshot_date)`. Branch/Tenant expansion requires ADR. | Pass |

### Stop Rules (Updated)

1. فشل أي Gate من `GP-01` إلى `GP-05` = **No-Go فوري**.
2. وجود اسم drift بديل فعّال (غير deprecated) = **No-Go**.
3. أي نص يسمح بـ backdating أو تعديل تاريخ يدوي في العمليات المالية = **No-Go**.
4. أي تعارض بين schema/contracts/errors في idempotency = **No-Go**.
5. أي تعارض في عقد الأجهزة/المتصفحات أو إسقاط installability من نطاق MVP بدون ADR جديد = **No-Go**.
6. غياب تحديث tracker أو غياب remediation package = **No-Go**.
7. Any Multi-Branch/Multi-Tenant expansion without an ADR expansion decision = **No-Go**.

---

**الإصدار:** 1.3
**تاريخ التحديث:** 10 مارس 2026
**الحالة:** Active Pre-Build Gate + Device Gate + Planned Post-V1 Gates
