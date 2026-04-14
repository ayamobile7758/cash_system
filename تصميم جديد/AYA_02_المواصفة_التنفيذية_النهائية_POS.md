# AYA 02 — المواصفة التنفيذية النهائية لـ POS
## نسخة نهائية مربوطة بالنظام كله، لا بواجهة POS فقط

---

## 1) الغرض من هذه المواصفة

هذه المواصفة هي المرجع الحاكم لإعادة بناء POS بحيث:
- تعالج المشكلة الحقيقية لا الشكل فقط
- تبقى مرتبطة بالدومين الحالي
- تنسجم مع shell/design system وبقية النظام
- تصبح أول operational surface صحيحة في Aya Mobile

---

## 2) تعريف المشكلة الحقيقية في POS

POS الحالية تعاني من 5 مشاكل مترابطة:
1. كثافة ميزات أعلى من قدرة الواجهة على العرض الواضح
2. coupling بين cart/payment/customer/held carts/search/tooling
3. command surface غير منضبطة بسبب topbar injection الحالي
4. tablet experience غير محسومة كمرجع بصري حقيقي
5. سلوك display/layout يخلط بين operational flow وبين management/analytical patterns

---

## 3) القرار المعماري النهائي لـ POS

### 3.1 POS archetype
POS = **Operational Flow Surface**

### 3.2 الجهاز المرجعي
**Tablet-first**
- الدعم للهاتف واللابتوب مطلوب
- لكن القرارات الأساسية تُقاس أولًا على التابلت

### 3.3 width policy
POS هو الاستثناء الوحيد من max-width shell-level.
القرار:
- shell-level width = full viewport
- لكن العناصر الداخلية لا تُمدد عشوائيًا
- يجب ضبط:
  - command bar line length
  - product density
  - cart review width rhythm
  - payment overlay width
على الشاشات الواسعة

### 3.4 قرار الـ toolbar — محسوم نهائيًا
القرار النهائي:
- الـ shell topbar العام يبقى global shell primitive
- POS command surface نفسها تكون **local to POS workspace**
- لا يُحقن search/categories/operational commands داخل global topbar

هذا ليس revert عشوائيًا، بل **فصل مسؤوليات**:
- global topbar = shell context
- POS local command surface = operational controls

> **ملاحظة تاريخية — commit `dceb5ac`:**
> في commit `dceb5ac` ("refactor(pos): merge sub-topbar into dashboard topbar via React Context") جُرّب نموذج معاكس حيث حُقنت POS commands في shell topbar عبر React Context. هذا القرار ثبت أنه يخلط shell context مع operational controls ويكسر فصل المسؤوليات. المواصفة الحالية **تنقض صراحة** ذلك الاتجاه. عند refactor POS phase 2، يجب إخراج POS commands من أي Context injection في shell topbar وإعادتها كـ local command surface داخل `PosWorkspace`.

---

## 4) النتيجة المطلوبة نهائيًا

POS يجب أن تتحول من:
- شاشة ميزات كثيرة
- كثافة حالات
- كثافة خيارات
- كثافة طبقات

إلى:
- flow واضح
- سريع
- domain-safe
- قليل الحمل المعرفي
- ممتاز على التابلت

---

## 5) الفلو الذهبي النهائي

## المحطة 1 — المنتجات
### الهدف
اختيار المنتجات بسرعة

### ما يظهر
- local command bar
- search
- category chips
- product selection surface
- cart summary / quick access
- held carts access

### ما لا يظهر
- customer/debt surface
- notes
- terminal code
- payment details
- advanced settings

---

## المحطة 2 — مراجعة السلة
### الهدف
التأكد من العناصر والإجمالي قبل الدفع

### أين تظهر؟
- **≥ 720px (container width):** مراجعة السلة تكون داخل **cart rail** الملتصق.
- **< 720px (mobile):** مراجعة السلة تبقى عبر `cart-review-view` كمسار رئيسي.

### ما يظهر
- cart lines
- quantity controls
- remove item
- line/invoice discount affordance
- total summary
- held carts access
- CTA واضح للدفع

### ما لا يظهر
- product grid كامل (على الموبايل فقط عند مراجعة السلة)
- مشتتات الدفع
- إدارة عميل افتراضيًا

---

## المحطة 3 — الدفع
### الهدف
التحصيل المالي بوضوح وبدون مشتتات

### ما يظهر
- isolated payment surface
- selected payment account(s)
- amount due
- amount received
- remaining/change
- split payment access
- customer/debt access عند الحاجة
- notes access عند الحاجة
- confirm action

### المسار المعتمد للدفع
- **CTA الرئيسي في الـ rail:** `دفع <طريقة>` (Smart default payment) عند توفر شروطه.
- **الـ overlay الكامل** يُفتح فقط عبر الرابط الثانوي: `خيارات دفع أخرى`.

### progressive disclosure داخل الـ overlay
- العناصر الأساسية (طريقة الدفع، المبلغ، التأكيد) تظهر دائمًا.
- الأقسام المتقدمة (عميل / خصم / تقسيم / دين / ملاحظات ورمز الطرفية)
  **مطوية افتراضيًا** وتفتح تلقائيًا عند الفعل المناسب.
- زر إغلاق مرئي في رأس الـ overlay.

### ما لا يظهر
- شبكة المنتجات
- كثافة خيارات لا تخص الدفع

---

## المحطة 4 — النجاح
### الهدف
إنهاء العملية بوضوح والاستمرار بسرعة

### ما يظهر
- invoice reference
- outcome summary
- print/view action إن كان مدعومًا
- start new sale

---

## 6) القرارات التشغيلية المعتمدة من صاحب المشروع

### 6.1 ما هو أساسي جدًا
- category chips
- product grid
- cart summary / cart rail
- total visibility
- primary checkout action (smart default payment when eligible)
- discount access
- held carts access
- clear confirm action

### 6.2 ما هو عند الطلب
- customer
- debt path
- notes
- split payment advanced controls

### 6.3 ما لا يظهر افتراضيًا
- terminal code
- irrelevant status chrome
- management-style clutter
- blind-POS violations

---

## 7) المحافظة على الدومين الحالي

يجب الحفاظ على كل ما يلي ما لم يثبت في الكود أنه زائد أو غير مستخدم:
- cart behavior
- line discount behavior
- invoice discount behavior
- selected account model
- fee-aware payment logic
- split payment logic
- selected customer / debt logic
- held carts lifecycle
- submission state handling
- duplicate/idempotency-like behavior
- stock validation / insufficient stock logic
- success payload semantics
- API payload compatibility قدر الإمكان

> **قاعدة صارمة:** لا تبسط الدومين من أجل تبسيط JSX.

---

## 8) توزيع المسؤوليات المقترح

### يبقى في `PosWorkspace`
- active step orchestration
- wiring مع store/hooks
- banners العامة
- success transition
- shell integration boundaries

### يخرج إلى `ProductSelectionView`
- search interaction
- category filters
- product grid/list
- add-to-cart behavior display layer

### يخرج إلى `CartReviewView`
- cart line rendering
- quantity controls
- remove behavior UI
- totals summary UI
- discount/held carts entry points

### يخرج إلى `PaymentCheckoutView`
- payment UI only
- account selection UI
- split payment expansion
- amount received / remaining / change UI
- customer/debt/note access UI
- confirm action UI

### يخرج إلى `PosSuccessView` أو equivalent
- success rendering
- post-sale actions

### يخرج إلى `HeldCartsPanel`
- restore
- discard
- list summary

---

## 9) قواعد الـ layout حسب الجهاز

### 9.1 Tablet (المرجع)
- local command surface واضحة وثابتة نسبيًا
- products تظهر بكثافة محسوبة
- cart rail مرئي وثابت كمسار مراجعة أساسي
- payment overlay لا يملأ الشاشة بطريقة مرهقة إلا إذا اقتضى السياق

### 9.2 Mobile
- CTA الرئيسي لا يختفي
- overlay/drawer لا ينكسر مع keyboard
- لا horizontal scroll
- first action remains obvious

### 9.3 Desktop / wide screens
- full viewport operational canvas مقبول
- لكن يجب منع تمدد command bar أو payment width أو cart density بشكل فوضوي
- استخدم local caps داخل surface، لا global max-width على POS shell

---

## 10) القرارات الخاصة بالخصم والسلال المعلقة

### 10.1 الخصم
بناءً على التشغيل الفعلي:
- الخصم ليس rare feature
- يجب أن يكون قريبًا جدًا
- لكن لا يسيطر على محطة المنتجات
- مكانه الصحيح: قريب من cart review والدفع

### 10.2 السلال المعلقة
- مهمة جدًا
- يجب أن تبقى قريبة دائمًا
- لكن لا يجب أن تصبح surface مسيطرة على first glance
- الوصول يكون واضحًا وثابتًا، والمحتوى نفسه في panel/drawer منضبط

---

## 11) العميل والدين

البيع العادي ليس customer-first.
القرار النهائي:
- guest/default sale هو المسار الافتراضي
- customer يظهر عند الحاجة
- debt path يظهر عند الحاجة
- لا تفرض customer chrome على كل عملية بيع

---

## 12) قواعد visual execution لـ POS

### 12.1 الألوان والخطوط
لا تُخترع هنا. تطبق من `DESIGN_SYSTEM.md`.
لكن يجب الالتزام على الأقل بـ:
- neutral warm background المستعمل حاليًا
- accent action color المعتمد
- `Tajawal` للعربية
- `Inter` للأرقام

### 12.2 touch targets
- 44px minimum
- 48–56px للأزرار الرئيسية في flow

### 12.3 hierarchy
- السعر/الإجمالي/المتبقي أوضح من meta text
- أسماء المنتجات العربية لا تتكسر بصريًا بشكل قاسٍ
- low-stock state مفهومة دون فوضى لونية

### 12.4 layers
- local command bar
- content surfaces
- floating aids
- payment overlay
- dialogs
كلها يجب أن تستخدم semantic mapping إلى z-index tokens القائمة، لا أرقامًا عشوائية.

---

## 13) ما الذي يمنع تنفيذه بشكل خاطئ؟

### ممنوع
- جعل POS dashboard ثانية
- إبقاء الدفع مجرد جزء آخر من cart rail مزدحم
- إخفاء split payments لأن الواجهة أبسط بدونها
- رمي customer/debt logic خارج POS كليًا
- تبسيط payment model إلى enum generic فقط
- patching shell bugs داخل POS CSS locally

---

## 14) تعريف النجاح النهائي لـ POS

POS تعتبر ناجحة فقط إذا:
- صارت أوضح من أول نظرة
- صار البيع العادي أسرع
- بقي الخصم والسلال المعلقة قريبين
- اختفى العميل من المسار العادي إلا عند الحاجة
- بقيت الدفعات المقسمة والرسوم والمنطق الحالي سليمًا
- اختفى topbar coupling المربك
- تحسن التابلت فعليًا، لا نظريًا

---

## 15) القرار النهائي

**نفّذ POS كـ local operational workflow surface داخل shell عام، مع الحفاظ على الدومين الحالي، وبفصل صارم بين المنتجات، المراجعة، الدفع، والنجاح.**

---

## 16) POS reference layout — tablet 1024×768

### 16.1 Station 1 — Products (default on open)
```
┌─────────────────────────────────────────────────────────────┐
│  SHELL TOPBAR   [user] [branch] [bell] [search] [nav ≡]     │  ← shell-level, untouched
├─────────────────────────────────────────────────────────────┤
│  POS LOCAL COMMAND BAR                                       │  ← local to PosWorkspace
│  [🔍 بحث المنتج]  [الكل][مشروبات][وجبات][…]  [سلال معلقة 2] │
├────────────────────────────────────────┬────────────────────┤
│                                        │  CART SUMMARY      │
│  PRODUCT GRID                          │  ───────────────   │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐          │  3 منتج            │
│  │img │ │img │ │img │ │img │          │  المجموع  12.500   │
│  │اسم │ │اسم │ │اسم │ │اسم │          │                    │
│  │سعر │ │سعر │ │سعر │ │سعر │          │  [دفع كاش]         │
│  │    │ │    │ │    │ │    │          │  [خيارات دفع أخرى]  │
│  └────┘ └────┘ └────┘ └────┘          │                    │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐          │                    │
│  │    │ │    │ │    │ │    │          │                    │
│  └────┘ └────┘ └────┘ └────┘          │                    │
│                                        │                    │
└────────────────────────────────────────┴────────────────────┘
```

### 16.2 Station 2 — Cart review (mobile only)
```
┌─────────────────────────────────────────────────────────────┐
│  SHELL TOPBAR                                                │
├─────────────────────────────────────────────────────────────┤
│  POS LOCAL COMMAND BAR   [← رجوع للمنتجات]   [سلال معلقة]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   CART LINES                                                 │
│   ───────────────────────────────────                        │
│   منتج أ        ×2     2.500         [−][+] [حذف]           │
│   منتج ب        ×1     4.000         [−][+] [حذف]           │
│   منتج ج        ×3     6.000         [−][+] [حذف]           │
│                                                              │
│   ───────────────────────────────────                        │
│   المجموع الفرعي           12.500                            │
│   [خصم على الفاتورة]                                         │
│   الإجمالي                 12.500                            │
│                                                              │
│                          [الانتقال إلى الدفع →]              │
└─────────────────────────────────────────────────────────────┘
```

### 16.3 Station 3 — Payment (isolated overlay)
```
┌─────────────────────────────────────────────────────────────┐
│  SHELL TOPBAR (dimmed)                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│    ╔══════════════════════════════════════════════════╗     │
│    ║  PAYMENT SURFACE                         [✕]     ║     │
│    ║  ──────────────────────────────────────         ║     │
│    ║  المستحق            12.500                      ║     │
│    ║  [نقد] [بطاقة] [محفظة]                          ║     │
│    ║  المستلم            [_______]                   ║     │
│    ║  المتبقي             0.000                      ║     │
│    ║                                                  ║     │
│    ║  [خصم] [تقسيم الدفع] [تسجيل دين] [ملاحظات]     ║     │
│    ║                                                  ║     │
│    ║              [تأكيد الدفع]                       ║     │
│    ╚══════════════════════════════════════════════════╝     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 16.4 Station 4 — Success
```
┌─────────────────────────────────────────────────────────────┐
│  SHELL TOPBAR                                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                      ✓                                       │
│              تمت عملية البيع                                │
│            فاتورة رقم INV-2026-00412                        │
│            المجموع 12.500                                   │
│                                                              │
│        [طباعة الفاتورة]   [عملية بيع جديدة]                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 16.5 Rules these wireframes enforce
- POS local command bar sits **below** shell topbar, not inside it
- Cart rail is visible in Station 1 at ≥720px; full cart review remains a mobile-only station
- Payment is a **separate surface**, not a rail inside cart
- Success is a full-surface state, not a toast
- Held carts access exists in both Station 1 and Station 2 but never dominates
- No customer/debt chrome in default flow — accessed on demand from payment surface only
