# AYA 06 — معايير القبول والحوكمة وضبط الهلوسة
## كيف نعرف أن التنفيذ صحيح؟ وكيف نمنع AI من الانحراف؟

---

## 1) الغرض من هذا الملف

هذا الملف يحدد:
- ما الذي يُقبل
- ما الذي يُرفض
- كيف تُراجع المهام
- كيف نمنع الوكيل من اتخاذ قرارات ظاهرها جميل وباطنها مدمّر للدومين أو الاختبارات

---

## 2) مبدأ القبول العام

التنفيذ لا يُقبل لأنه:
- أجمل بصريًا فقط
- أو لأن الكود أنظف فقط
- أو لأن الوكيل “قام بعمل كبير”

بل يُقبل فقط إذا اجتمعت هذه الشروط:
1. صحة تشغيلية
2. سلامة دومين
3. اتساق مع AYA و design system
4. عدم كسر الاختبارات المحمية بلا مبرر
5. تحسن فعلي على الجهاز المرجعي

---

## 3) قواعد منع الهلوسة (H-rules)

### H-01
لا تحذف ميزة بدعوى التبسيط دون دليل تشغيل واضح.

### H-02
لا تغيّر payment/cart/customer/debt logic قبل فحص:
- API
- store
- UI
- success state
- error states

### H-03
لا تحل مشكلة width/spacing محليًا إذا كان الجذر shell-level.

### H-04
لا تستبدل state موجودة بـ generic reducer جديد لمجرد أن ذلك يبدو أنظف.

### H-05
قبل تغيير أي visible Arabic string أو CSS class أو selector محتمل، افحص الاختبارات أولًا.

### H-06
لا تنشئ token authority ثانية داخل AYA أو داخل الصفحة.

### H-07
لا تخلق z-index scale محلية إذا كانت design system تملك scale أصلًا.

### H-08
لا تعيد بناء SectionCard أو primitive قائمة من الصفر إلا إذا كان ذلك مطلوبًا صراحة أو ثبت فشل primitive الحالية.

### H-09
لا تعتبر local patch نجاحًا إذا كان أصل المشكلة system-level.

### H-10
لا تنقل feature من visible إلى hidden لأنك تفترض أنها نادرة؛ استخدم العقد التشغيلي المعتمد فقط.

### H-11
لا تكسر RTL بسلوك left/right hardcoded.

### H-12
لا تعتبر التنفيذ ناجحًا إذا كسبت البساطة وخسرت وضوح الدومين أو صحة السلوك المالي.

### H-13
التمييز بين **progressive disclosure** و **hiding-by-guessing**:
- **مسموح**: طيّ الحقول خلف `<details>` واضحة ومُسمّاة وقابلة للوصول بالكيبورد،
  مع فتح تلقائي عند الفعل المناسب (مثل اختيار دين يفتح قسم العميل والدين).
- **ممنوع**: إزالة الحقول من الـ DOM أو إخفاؤها خلف gesture غير قابل للاكتشاف،
  لأن ذلك يُعد إخفاءً بالافتراض ويظل مخالفًا لـ H-10.

---

## 4) Test Protection Protocol

### 4.1 القاعدة
أي refactor بصري أو بنيوي يجب أن يفترض أن:
- classes
- visible Arabic labels
- ARIA roles
- DOM order
- toolbar/filter/export affordances
قد تكون محمية باختبارات.

### 4.2 ما الذي يجب فعله قبل التعديل؟
- grep داخل tests/e2e
- grep داخل tests/unit
- تحديد selectors والنصوص المحمية
- وضع قائمة “what cannot silently move or rename”

### 4.3 ما الذي يُرفض؟
يُرفض التنفيذ إذا:
- غيّر hooks/selectors/strings المحمية بدون فحص
- حذف behavior محمي بالاختبارات دون توثيق
- كسر reports/POS tests ثم اعتبر ذلك collateral damage مقبولًا

---

## 5) معايير قبول POS

يُقبل تنفيذ POS فقط إذا:
- local command surface أصبحت واضحة
- payment صار surface مستقلة فعلًا
- الخصم بقي قريبًا
- held carts بقيت قريبة وواضحة
- العميل خرج من المسار الافتراضي
- split payments بقيت تعمل
- success state بقيت سليمة
- التابلت صار أفضل فعلًا
- لا توجد طبقات متداخلة مربكة

---

## 6) معايير قبول Reports

يُقبل تنفيذ Reports فقط إذا:
- page header واضح
- command bar واحدة فقط
- الفلاتر المتقدمة خارج first viewport
- النتائج تبدأ مبكرًا
- width-analytical مطبقة
- export/actions غير مكررة عبر components متعددة
- لا توجد wall of controls أعلى الصفحة

---

## 7) معايير قبول shell/system

يُقبل تنفيذ shell/system فقط إذا:
- width ownership أصبحت واضحة
- كل archetype يستهلك width token معروفة
- surface hierarchy موحدة
- cards لم تعد تطفو بلا معنى
- z-index mapping واضحة
- لا gradient/transition يخلق انفصالًا غير مبرر بين shell والمحتوى

---

## 8) معايير بصرية إلزامية

- contrast يحقق WCAG AA على الأقل حيث ينطبق
- primary CTA بارزة بوضوح
- warning/danger states مفهومة
- الأرقام المهمة أوضح من meta text
- focus-visible واضح
- disabled state لا تبدو broken
- overlay backdrops واضحة لكنها لا تقتل readability

---

## 9) معايير RTL إلزامية

- لا `left/right` hardcoded بلا حاجة
- استعمل logical properties
- drawer/toolbar/button alignment يحترم RTL
- icon placement لا يربك القراءة بالعربية

---

## 10) معايير رفض التنفيذ

يجب رفض التنفيذ إذا:
- بدا أجمل لكنه خسر ميزة مهمة
- كسر payment model
- كسر reports filters/export flows
- أعاد مشكلة shell-level داخل local CSS
- كسر الاختبارات المحمية بلا مبرر
- أبقى نفس الحمل المعرفي مع layout جديد فقط
- أضاف طبقات أو primitives جديدة بلا authority واضحة

---

## 11) آلية القرار النهائي

### إذا كانت المهمة تخص:
- الدومين المالي → code truth أولًا
- الألوان/التباين/states → design system truth أولًا
- flow/surface/layout strategy → AYA truth أولًا
- selectors/strings/DOM stability → tests truth أولًا

---

## 12) القرار النهائي

**أي تنفيذ لا يثبت أنه حمى الدومين، احترم design system، احترم الاختبارات، وخفف الحمل المعرفي فعلًا، يُعتبر تنفيذًا غير مقبول.**

---

## 13) Measurable success metrics

Acceptance in sections 5–7 is qualitative. This section makes it measurable.
Every phase PR must record these values in the PR body.

### 13.1 POS — tablet reference device (1024×768)

| Metric | Target | How to measure |
|--------|--------|----------------|
| Taps from app open to first sale confirmed | ≤ 6 | Manual run through gold flow |
| Visible primary controls at "Products" station | ≤ 9 | Count interactive elements above the fold |
| Visible primary controls at "Cart review" station | ≤ 7 | Same |
| Visible primary controls at "Payment" station | ≤ 8 | Same |
| DOM depth from `<body>` to cart line item | ≤ 12 | React DevTools or `document.querySelector('[data-testid=cart-line]').closest('body')` chain length |
| POS workspace total nodes | ≤ 600 | `document.querySelectorAll('[data-pos-workspace] *').length` after cart has 3 items |
| First-viewport horizontal scroll | 0 px | Visual check at 1024×768 |
| Payment surface z-index | `var(--z-overlay)` | CSS audit |
| Time from "confirm payment" click to success surface visible | ≤ 400 ms | Performance trace, excluding network |

### 13.2 Reports — desktop reference (1440×900)

| Metric | Target | How to measure |
|--------|--------|----------------|
| Visible filter controls in first viewport | ≤ 5 | Count |
| Advanced filters location | Inside drawer | Visual check |
| First result row Y position | ≤ 500 px from top | Layout inspector |
| Duplicate export CTAs | 0 | Grep component tree |
| Page width cap | `var(--width-analytical)` (1400 px) | CSS audit |

### 13.3 Shell — any breakpoint

| Metric | Target |
|--------|--------|
| Archetypes reading width from a local CSS rule instead of token | 0 |
| Local z-index scales defined outside DESIGN_SYSTEM §10 | 0 |
| Components using `position: sticky` inside `overflow: hidden` parent | 0 |
| Hardcoded `left:` / `right:` in component CSS | 0 |

### 13.4 Recording protocol
1. Run the gold flow on the reference device after the phase is complete.
2. Fill the metric table in the phase PR body (copy the template from this section).
3. If any metric misses target, either fix or record a waiver with justification approved by Planner.
4. Waivers accumulate in `ai-system/BRANCH_SUMMARY.md` under "outstanding waivers".

### 13.5 Stop words — auto-reject on sight
If a phase PR description contains any of these phrases without an explicit Planner waiver, the phase is auto-rejected:
- "rewrite from scratch"
- "new state management layer"
- "replace SectionCard"
- "unify all primitives"
- "minor test updates" (without listing which and why)
- "temporarily disabled test"
- "will add back later"
- "big-bang"

These phrases have historically preceded scope explosions and broken domain invariants.
