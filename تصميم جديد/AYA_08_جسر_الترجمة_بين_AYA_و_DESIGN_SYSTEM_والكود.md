# AYA 08 — جسر الترجمة بين AYA و DESIGN_SYSTEM والكود
## الوثيقة التي تمنع التعارض بين المعمارية، القيم البصرية، والكود الحالي

---

## 1) الغرض من هذا الملف

هذا الملف يحل المشكلة التالية:
- AYA تتحدث بلغة معمارية وتشغيلية
- `DESIGN_SYSTEM.md` يتحدث بلغة tokens/primitives/states
- الكود الحالي يتحدث بلغة components/hooks/stores/routes/tests

من دون هذا الجسر سيظهر التعارض حتى لو كانت الوثائق الثلاث صحيحة كل على حدة.

---

## 2) من يملك الحقيقة في ماذا؟

| المجال | صاحب الحقيقة |
|---|---|
| product archetypes / flow / screen mission | AYA 01 + AYA 02 + AYA 04 |
| shell / width / surface strategy / primitives usage | AYA 03 |
| visual tokens / exact colors / fonts / states / z-index numeric scale | `DESIGN_SYSTEM.md` |
| business logic / payment / customer / debt / held carts / API payload | الكود الحالي |
| regression protection / protected selectors & strings | الاختبارات الحالية |

---

## 3) Glossary Bridge

| مصطلح AYA | المعنى التنفيذي |
|---|---|
| Operational Flow Surface | صفحة تنفيذ سريعة مثل POS |
| Analytical Surface | صفحة تقارير/تحليل |
| Management Surface | صفحة إدارة قوائم وإجراءات |
| Detail Surface | صفحة تفاصيل كيان واحد |
| Settings Surface | صفحة إعدادات/نماذج |
| Command Surface | toolbar أو filter bar واحدة خاصة بالصفحة |
| Workspace Surface | الحاوية الداخلية للصفحة بعد shell |
| Primary Content Surface | كتلة المحتوى الأهم في الصفحة |
| Secondary Content Surface | محتوى مساعد أو أقل أولوية |
| Status Surface | banners / inline status |
| Overlay Surface | modal / drawer / fullscreen overlay |

### 3.1 مصطلحات متقاربة — تفكيك اللبس

| المصطلح | المعنى | ليس هو |
|---|---|---|
| **Shell topbar** | الـ topbar العلوي المشترك لكل الصفحات المحمية. يحمل: user, branch, bell, search, nav. | ليس هو POS local command bar. لا يُحقن فيه أي POS state. |
| **Global shell** | الهيكل العام: topbar + drawer + bottom bar + content slot. يحكمه `components/dashboard/dashboard-shell.tsx`. | ليس هو صفحة. ليس هو workspace. |
| **Page header** | عنوان الصفحة + meta خاص بها داخل الصفحة نفسها (archetype-dependent). | ليس هو shell topbar. ليس هو command surface. |
| **Workspace (Workspace Surface)** | الحاوية الداخلية لمحتوى الصفحة بعد shell. يطبّق `width token` الخاص بـ archetype. | ليس هو shell. ليس هو page header. |
| **Content area** | المنطقة الفعلية التي يظهر فيها المحتوى الأساسي داخل workspace. | ليس هو workspace نفسها — هي أصغر منها وتقع بداخلها. |
| **Surface** | مفهوم معماري: دور دلالي يحتل مساحة بصرية (Command, Primary, Secondary, Status, Overlay). | ليس هو primitive. ليس هو component ملموس. |
| **Card** | primitive بصري قابل لإعادة الاستخدام (SectionCard, MetricCard). قد يمثل أكثر من surface role. | ليس هو surface. card واحد يمكن أن يلبي role واحدًا، لكن ليس كل surface هو card. |
| **Panel** | منطقة محتوى ثابتة نسبيًا داخل الصفحة (side panel, filter panel). قد تُبنى من SectionCard أو primitive آخر. | ليست drawer (drawer مؤقت وعائم). ليست card واحدة بالضرورة. |
| **Drawer** | overlay جانبي مؤقت يُفتح ويُغلق (nav drawer, filter drawer). | ليس panel ثابتًا. ليس modal. |
| **Overlay** | أي سطح يطفو فوق المحتوى العادي عبر z-index (drawer, modal, payment surface, toast). | ليس toolbar. ليس card عادي. |

---

## 4) Width Bridge

| Archetype | Width Token | القرار |
|---|---|---|
| Operational | `--width-operational` | full viewport / no shell max-width cap |
| Analytical | `--width-analytical` | 1400px |
| Management | `--width-management` | 1600px |
| Detail | `--width-detail` | 1100px |
| Settings | `--width-settings` | 900px |

### القاعدة
- إذا رأيت صفحة management تضع max-width خاصًا بها داخل module CSS، فهذا smell حتى يثبت العكس.
- إذا رأيت صفحة analytical بلا width cap، فهذا smell حتى يثبت العكس.

---

## 5) Surface Hierarchy Bridge

### structural levels من design system
- Base
- Surface
- Raised
- Overlay

### semantic surfaces من AYA
- Base Page Surface
- Workspace Surface
- Command Surface
- Primary Content Surface
- Secondary Content Surface
- Status Surface
- Overlay Surface

### translation rule
الوكيل لا يختار واحدًا من النظامين ويهمل الآخر.
بل يطبق semantic role ثم يربطه بـ structural level وprimitive/tone مناسبة.

---

## 6) SectionCard Bridge

### القرار النهائي
SectionCard ليست ملغاة.
ولا تعتبر universal answer لكل شيء.

### كيف تترجم؟
- AYA تقول: لا تخلط كل الأسطح في card واحدة من نفس النغمة
- DESIGN_SYSTEM يحدد tones/variants التنفيذية
- الكود الحالي ينفذ primitive أو implementation موجودة

### rule
إذا احتجت surface جديدة، اسأل أولًا:
- هل هذه role جديدة فعلاً؟
- أم role موجودة يمكن تمثيلها بـ SectionCard tone مناسب؟

---

## 7) POS Toolbar Bridge

### التعارض السابق
- التنفيذ الحالي استخدم global topbar injection
- AYA أرادت local toolbar

### القرار النهائي المحسوم
- shell topbar يبقى shell-level
- POS operational command surface تصبح local داخل POS workspace
- لا يعني ذلك حذف shell topbar
- بل يعني فصل shell context عن POS commands

### النتيجة التنفيذية
أي كود خاص بـ:
- search
- category chips
- product display controls
- operational refresh controls
يجب أن يكون داخل POS page surface، لا داخل shell global command host.

---

## 8) Reports Bridge

### ما تقوله AYA
Reports analytical surface ويجب أن تتوقف عن البدء بجدار فلاتر.

### ما يعنيه ذلك في الكود
- لا تغيّر reports blindly
- اقرأ tests أولًا
- استخرج page header / command bar / advanced filter separation تدريجيًا
- حافظ على export/filter semantics المحمية

### النتيجة المطلوبة
- visible analytical command bar واحدة
- advanced filters داخل drawer/panel
- نتائج تبدأ بصريًا مبكرًا

---

## 9) Test Bridge

### القاعدة
كل ما هو:
- visible Arabic string
- CSS hook
- ARIA label
- toolbar button text
- filter label
- export label
قد يكون محميًا في tests.

### الترجمة العملية
قبل أي refactor:
1. اقرأ الاختبارات ذات الصلة
2. حدّد protected UI hooks
3. إن غيّرت شيئًا intentionally، عدّل الاختبارات في نفس المهمة وبشكل موثق

---

## 10) RTL / Accessibility Bridge

### RTL
إذا قالت AYA “layout RTL-correct”، فهذا يعني في الكود:
- logical properties
- RTL-aware alignment
- no left/right shortcuts unless justified

### Accessibility
إذا قالت AYA “clarity and contrast”، فهذا يعني في الكود:
- state visibility
- focus visible
- aria labels
- readable hierarchy
- WCAG-aware contrast

---

## 11) ماذا يفعل الوكيل عند التعارض؟

### إذا كان التعارض عن:
- لون أو token أو radius أو z-index numeric → ارجع إلى `DESIGN_SYSTEM.md`
- flow أو archetype أو command density → ارجع إلى AYA
- payment/debt/held carts behavior → ارجع إلى code truth
- selector/string stability → ارجع إلى tests

---

## 12) القرار النهائي

**هذه الوثيقة هي المترجم الرسمي بين ما “تريده الحزمة” وما “يملكه الكود والتصميم حاليًا”. أي تنفيذ جاد يجب أن يمر عبر هذا الجسر قبل اتخاذ قرارات كبرى.**
