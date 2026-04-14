# AYA 04 — خارطة تنفيذ المكونات القادمة
## ماذا بعد POS؟ وكيف نمنع عودة نفس المشاكل في بقية النظام

---

## 1) الغرض من هذا الملف

هذا الملف يحدد:
- الترتيب الصحيح للعمل بعد تثبيت المرجعية الجديدة
- كيف ننتقل من POS إلى بقية النظام
- ما الذي يجب تثبيته أولًا
- ما الذي لا يجوز البدء به قبل نضج ما قبله

---

## 2) القاعدة العليا

بعد POS لا ننتقل مباشرة إلى "أي صفحة فيها مشكلة".
بل ننتقل وفق هذا المنطق:
1. ما يؤثر على أكثر من صفحة
2. ما إذا تركناه سيعيد إنتاج نفس الخطأ
3. ما يملك archetype واضحًا وقيمة كبيرة في ضبط بقية النظام

---

## 3) الترتيب المعتمد للمرحلة القادمة

## المرحلة A — تثبيت قواعد النظام المشتركة
هذه ليست صفحة منفردة، لكنها إلزامية قبل أو أثناء تنفيذ POS:
- width hierarchy
- command surface rules
- shell/page boundary rules
- visual bridge with design system
- z-index governance
- test protection protocol
- SectionCard / primitive policy

> لا يجوز الانتقال إلى Reports أو أي صفحة أخرى قبل تثبيت هذه القواعد أو على الأقل توثيقها واعتمادها.

---

## المرحلة B — POS
POS تبقى الأولوية الأولى لأنها:
- أكثر شاشة تشغيلية حساسة
- أفضل مكان لاختبار operational archetype
- تكشف بسرعة أخطاء flow والlayering والدومين

شرط الانتقال بعدها:
- POS flow واضح
- local command surface صحيح
- domain preserved
- tablet experience مقبول جدًا

---

## المرحلة C — Reports
Reports هي أول analytical surface يجب إصلاحها بعد POS والقواعد المشتركة.

### لماذا Reports ثانيًا؟
لأن مشاكلها:
- ليست محلية فقط
- تكشف analytical archetype rules
- تضبط مستقبل dashboard/report pages كلها

### المشكلة الحالية في Reports
- أدوات أكثر من اللازم في أعلى الصفحة
- تقسيمات غير واضحة
- filters موزعة على أكثر من component
- page تبدأ بالتحكم لا بالنتيجة
- command density عالية

### النتيجة المطلوبة
Reports يجب أن تصبح:
1. PageHeader
2. Summary / KPI row عند الحاجة
3. CommandBar واحدة فقط
4. Results zone واضحة
5. Advanced filters داخل FilterDrawer أو panel منضبط

### القواعد الخاصة بتنفيذ Reports
- visible controls = 3–4 max غالبًا
- export يبقى page-level action لا component duplication
- time range primary visible
- بقية الفلاتر المتقدمة في drawer
- no double nav / double tabs / double command bars
- أول viewport لا يبتلع كله بالفلاتر

### شرط البدء
قبل تعديل Reports يجب تنفيذ:
- shell width authority
- command surface primitive rule
- test protection grep/update protocol

---

## المرحلة D — Management Surfaces
### أمثلة
- Products
- Invoices
- Debts
- Expenses
- Accounts

### لماذا بعدها؟
لأن هذه الصفحات ستستفيد مباشرة من:
- width-management token
- filter bar rules
- section-card policy
- primitive specs

### ما الذي سنعالجه هنا؟
- list density
- action placement
- filter duplication
- inconsistent widths
- page-level vs item-level action confusion

---

## المرحلة E — Detail Surfaces
### أمثلة
- Invoice detail
- Customer detail
- Debt detail

### لماذا لاحقًا؟
لأن detail surfaces تحتاج:
- stable primitives
- stable width policy
- stable secondary surface behavior
ولا يجب فتحها قبل ضبط shell/system rules وmanagement pages.

---

## المرحلة F — Settings Surfaces
### أمثلة
- settings
- permissions
- system preferences

### الهدف
إنهاء النظام بقواعد forms نظيفة وواضحة لا تكرر مشاكل analytics/management.

---

## 4) ما الذي لا يجوز فعله بعد POS؟

- لا نعيد تصميم Reports مباشرة من الصفحة فقط
- لا نفتح management pages قبل تثبيت filter/width primitives
- لا نغير page بعد page بطريقة محلية متناقضة
- لا نسمح لكل صفحة أن تختار toolbar/filter/header behavior من نفسها

---

## 5) تعريف الجاهزية للمرحلة التالية

### POS → Reports
مسموح فقط إذا:
- command surface rule حُسمت
- shell width rule حُسمت
- visual bridge documented
- z-index mapping documented
- POS implementation validated

### Reports → Management
مسموح فقط إذا:
- analytical pattern ثبت
- filter drawer/command bar pattern ثبت
- summary/result hierarchy صارت واضحة

### Management → Detail/Settings
مسموح فقط إذا:
- widths stabilized
- page actions stabilized
- section-card usage صار منضبطًا

---

## 6) القرار النهائي

**المسار الصحيح ليس POS ثم صفحة عشوائية، بل POS ثم analytical rules عبر Reports، ثم management، ثم detail/settings. هكذا نمنع عودة الخطأ نفسه بأسماء مختلفة.**

---

## 7) Current Reports state — audit snapshot

Before phase 7 starts, executor must re-verify this audit against live code. Values here were true at authoring time and may drift.

### 7.1 Files owning Reports surface
- `app/(dashboard)/reports/page.tsx` — route guard + baseline wiring
- `components/dashboard/reports-overview.tsx` — headings, filter controls, section links, export link
- `components/dashboard/reports-advanced-charts.tsx` — comparison charts
- `app/api/reports/advanced/export/route.ts` — export endpoint

### 7.2 Known smells (to be confirmed by audit, not trusted blindly)
1. **Wall of filters above the fold** — filter controls occupy first viewport before any result row is visible
2. **Duplicate export affordances** — export link exists in overview + chart area
3. **No explicit width cap token** — page reads width from local rules instead of `--width-analytical`
4. **Command density** — multiple command-like regions instead of one analytical command bar
5. **Sections stacked as uniform cards** — no visible hierarchy between primary summary and secondary breakdowns

### 7.3 Protected surfaces per test map
Phase 7 must not silently rename or remove:
- filter control labels asserted in `px11-reports.spec.ts` and `px24-analytical-config.spec.ts`
- advanced charts heading asserted in `px11-reports.spec.ts` and `px18-visual-accessibility.spec.ts`
- export link href asserted in `px11-reports.spec.ts`

### 7.4 Non-goals for phase 7
- New reports
- New export formats
- New chart types
- Changes to `/api/reports/advanced/export` response shape

Phase 7 is **structural only**: archetype compliance, width compliance, command bar unification, filter drawer extraction.
