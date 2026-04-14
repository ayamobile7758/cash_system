# AYA 03 — هندسة الواجهة والـ Shell والطبقات
## المرجعية المعمارية التي تمنع تكرار مشاكل POS وReports وبقية الصفحات

---

## 1) الغرض من هذا الملف

هذا الملف هو المرجع المركزي للقواعد المشتركة بين صفحات النظام:
- shell behavior
- width strategy
- surface hierarchy
- primitives
- visual identity bridge
- states
- z-index mapping
- RTL/accessibility rules

إذا لم تُضبط هذه الطبقة، ستعود نفس المشاكل مهما حسّنت صفحة منفردة.

---

## 2) التشخيص المعماري المعتمد

### 2.1 مشكلة shell/content/cards
المشكلة الحالية ليست “في الصفحة فقط”. هناك انفصال بصري ومعماري بين:
- topbar/shell layer
- dashboard-content layer
- cards/content layer

النتيجة:
- transitions غير مبررة بصريًا
- page surface غير واضحة
- cards تبدو طافية بلا سبب

### 2.2 مشكلة width ownership
لا توجد حتى الآن سياسة موحدة كافية على مستوى shell لكل archetype، ما يدفع الصفحات إلى:
- اختراع max-width locally
- التصرف بشكل مختلف عند الشاشات الواسعة
- تقديم rhythm غير متجانسة بين الصفحات

### 2.3 مشكلة command density
بعض الصفحات، خصوصًا Reports، تبدأ بأدوات كثيرة قبل المحتوى، ما يخلق analytical clutter ويؤخر قيمة الصفحة الحقيقية.

---

## 3) القرار النهائي: AYA لا تستبدل DESIGN_SYSTEM

### 3.1 ماذا يأخذ هذا الملف من `DESIGN_SYSTEM.md`؟
هذا الملف **لا يعيد تعريف**:
- tokens
- colors
- spacing primitives
- state colors
- z-index numeric scale
- section-card implementation details
إذا كانت معرفة في `DESIGN_SYSTEM.md`.

### 3.2 ماذا يضيف هذا الملف؟
- archetype mapping
- width policy بالنِسَب والأرقام المرجعية
- semantic surface roles
- primitive usage rules
- shell rules
- RTL/accessibility obligations
- command/sticky budgets

---

## 4) Visual Identity Bridge

هذه القيم معتمدة كهوية تشغيلية مرجعية للنظام الحالي، ويجب أن تبقى متسقة مع `DESIGN_SYSTEM.md`:

### 4.1 الألوان المرجعية
- background neutral: `#F9F8F5`
- primary accent: `#CF694A`
- لا تُنشأ palette ثانية داخل AYA
- إذا كانت هناك `--aya-*` و `--color-*` معًا، فالهدف النهائي هو منع الازدواجية وتثبيت authority واحدة

### 4.2 الخطوط
- العربية: `Tajawal`
- الأرقام واللاتيني: `Inter`

### 4.3 أحجام النص المرجعية
- Title / section emphasis: `20px`
- Body / default operational text: `15px`
- Meta / helper text: `13px`

### 4.4 touch target
- الحد الأدنى: `44px`
- العناصر الأساسية في operational flows: `48px–56px`

### 4.5 spacing/radius
القيم الدقيقة تأتي من design system، لكن القاعدة المعمارية هي:
- spacing rhythm ثابتة
- radius scale لا تُخترع محليًا
- لا manual spacing patching داخل الصفحة إلا عند وجود استثناء مبرر

---

## 5) Width Hierarchy المعتمدة بالأرقام

هذه القيم هي المرجعية التنفيذية للحزمة:

```css
--width-operational: none;      /* POS and cashier flows */
--width-analytical: 1400px;     /* Reports / analytics */
--width-management: 1600px;     /* Products / invoices / list-heavy pages */
--width-detail: 1100px;         /* invoice/customer/debt detail */
--width-settings: 900px;        /* settings / permission forms */
```

### قواعد التطبيق
- الـ shell يطبّق width policy حسب archetype
- الصفحة لا تخترع max-width خاصًا بها إلا إذا وثق الاستثناء
- POS يبقى استثناء full-viewport
- Reports لا تبقى ممتدة بلا سقف

---

## 6) Surface Hierarchy — التوحيد النهائي

### 6.1 المستويات structural (authoritative)
المستويات الهيكلية الأساسية تبقى:
1. Base
2. Surface
3. Raised
4. Overlay

### 6.2 الأدوار semantic (AYA)
الأسطح الدلالية المسموح بها:
1. Base Page Surface
2. Workspace Surface
3. Command Surface
4. Primary Content Surface
5. Secondary Content Surface
6. Status Surface
7. Overlay Surface

### 6.3 كيف يجتمعان؟
- semantic role يصف وظيفة السطح
- structural level يصف درجة ارتفاعه وtone behavior

### 6.4 أمثلة mapping
| Semantic Role | Structural Level | Primitive / Tone Example |
|---|---:|---|
| Base Page Surface | Base | dashboard-content / page base |
| Workspace Surface | Surface | workspace container |
| Command Surface | Surface أو Raised | toolbar / filter bar |
| Primary Content Surface | Raised | section-card default |
| Secondary Content Surface | Surface | section-card subtle / flat |
| Status Surface | Surface أو Raised | banner / inline status card |
| Overlay Surface | Overlay | drawer / modal / fullscreen checkout |

---

## 7) SectionCard policy

### القرار النهائي
SectionCard تبقى primitive أساسية.
لكن لا يجوز استعمالها كإجابة موحدة لكل حالة بلا تفريق.

### القاعدة
يجب ربط استعمالها بـ:
- semantic role
- tone/variant من design system
- archetype context

### ما يعنيه ذلك عمليًا
- primary content في management/detail pages قد يكون `default`
- secondary summaries قد تكون `subtle` أو `flat`
- inset surfaces لا تستخدم مكان overlay أو status
- accent tone لا يتحول إلى default everywhere

---

## 8) Primitive Specs المعتمدة

## 8.1 PageHeader
### الوظيفة
هوية الصفحة + title + meta + page-level actions

### يُسمح به
- title
- subtitle/meta line قصيرة
- 1–3 page-level actions max

### لا يُسمح به
- فلاتر كثيرة
- chips كثيرة
- component-level controls كثيرة

---

## 8.2 CommandBar
### الوظيفة
الأوامر الأساسية المتكررة للصفحة

### يُسمح به
- 2–4 controls أساسية visible
- search أو filter primary
- 1 primary action أو 1 export action عند الحاجة

### لا يُسمح به
- كل فلاتر الصفحة
- duplication with PageHeader
- أكثر من صف أو stacking غير منضبط

### sticky policy
- حسب archetype budget فقط

---

## 8.3 FilterDrawer
### الوظيفة
احتواء الفلاتر المتقدمة أو الأقل تكرارًا

### يُسمح به
- secondary filters
- grouping واضح
- apply/reset واضحان

### لا يُسمح به
- primary filters الأساسية التي يحتاجها المستخدم دائمًا

---

## 8.4 MetricCard
### الوظيفة
عرض KPI مختصر أو analytical summary

### القاعدة
- لا يتحول إلى navigation tile
- لا يزاحم النتائج الأساسية
- يستخدم فقط عندما يخدم قرارًا أو قراءة تحليلة

---

## 8.5 ContextPanel
### الوظيفة
عرض معلومات جانبية أو مساعد contextual

### القاعدة
- secondary by nature
- لا يُستخدم كبديل عن content الرئيسي
- لا يسرق first viewport من المحتوى الأساسي

---

## 8.6 Toolbar (Operational local)
### الوظيفة
أوامر الصفحة التشغيلية الخاصة بالـ workflow

### مثال
POS local command surface

### القاعدة
- local to page
- لا يتحول إلى global shell injection

---

## 9) Sticky Budget المعتمد لكل archetype

| Archetype | Allowed Sticky Surfaces |
|---|---|
| Operational | 1 command surface + 1 contextual assist max |
| Analytical | 1 command surface only |
| Management | 1 filter/command bar only |
| Detail | 1 sticky header only |
| Settings | 0 sticky by default |

---

## 10) Z-index policy

### القرار النهائي
AYA لا تنشئ scale رقمية جديدة.
المرجع العددي يبقى في `DESIGN_SYSTEM.md`.

### لكن AYA تفرض semantic mapping:
- base page → `z-base`
- sticky command surfaces → `z-sticky`
- floating assists → `z-floating`
- drawers/panels → `z-drawer`
- overlays → `z-overlay`
- dialogs → `z-dialog`
- fullscreen critical surfaces → `z-fullscreen`

### ممنوع
- أرقام z-index hardcoded بدون مرجعية
- patchwork fixes صفحة-صفحة

---

## 11) states

كل primitive وكل interactive surface يجب أن يملك states واضحة على الأقل:
- idle
- hover
- active
- focus-visible
- disabled
- error إذا كان applicable

AYA لا تعيد رسم الألوان هنا، لكنها تفرض أن تكون هذه الحالات معرفة ومنفذة ومرئية بوضوح.

---

## 12) RTL rules

هذه قواعد إلزامية:
- استخدم logical properties (`margin-inline`, `padding-inline`, `inset-inline-start`, `border-inline-end`)
- لا تعتمد `left/right` إلا عند الضرورة القصوى الموثقة
- ترتيب الأزرار يجب أن يكون RTL-aware
- overlays/drawers يجب أن تفتح وتثبت بما يناسب RTL
- icon-only controls يجب أن تبقى واضحة في RTL context

---

## 13) Accessibility rules

### قواعد دنيا إلزامية
- text contrast على الأقل WCAG AA
- large text contrast لا يقل عن 3:1 حيث ينطبق
- focus visible واضح
- aria-label للعناصر الأيقونية فقط
- keyboard navigation يجب ألا تنكسر
- overlay/dialog focus management يجب أن يبقى صحيحًا
- disabled state يجب أن تكون واضحة ولكن لا تبدو معطلة بصريًا فقط بل مفهومة

### Notes
الصفحات التحليلية والتشغيلية كلاهما تحتاجان وضوحًا، لكن operational surfaces تحتاج clarity under stress أكثر من decorative nuance.

---

## 14) قواعد Reports القادمة

Reports يجب أن تطبق هذه القواعد عند وقت التنفيذ:
- no filter wall at top
- one analytical command bar only
- advanced filters in drawer
- metrics لا تبتلع الصفحة
- results تبدأ داخل first viewport قدر الإمكان
- width = analytical width token

---

## 15) القرار النهائي

**هذا الملف هو المرجعية العليا لكل ما هو shell-level وsurface-level وprimitive-level في Aya. أي صفحة تكسر هذه القواعد يجب إصلاحها من الجذر، لا ترقيعها محليًا.**
