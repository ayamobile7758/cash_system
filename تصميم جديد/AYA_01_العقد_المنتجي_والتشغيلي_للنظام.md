# AYA 01 — العقد المنتجي والتشغيلي للنظام
## المرجعية العليا لشكل النظام وكيفية عمل صفحاته

---

## 1) الغرض من هذا العقد

هذا العقد يحدد كيف يجب أن يُبنى Aya Mobile كنظام حقيقي، لا كصفحات مستقلة متفرقة.

الهدف منه منع الأخطاء التالية:
- بناء كل شاشة بفلسفة مختلفة
- تكرار نفس الفوضى من POS إلى Reports ثم بقية الصفحات
- خلط صفحات التشغيل مع صفحات التحليل والإدارة
- جعل كل صفحة تحل shell/width/spacing locally

---

## 2) تعريف المنتج

Aya Mobile هو **نظام تشغيل متجر**، وليس “POS وبعض الصفحات حولها”.
لكل نوع عمل داخل النظام نوع واجهة مناسب له.

---

## 3) Archetypes النظام المعتمدة

## 3.1 Operational Flow Surface
**أمثلة:** POS، أي cashier flow لاحق، أي quick transactional flow

**الهدف:**
- السرعة
- الدقة
- الوضوح
- أقل حمل معرفي ممكن

**المستخدم:**
- موظف تشغيل
- يعمل تحت ضغط
- يحتاج لمسًا واضحًا

**قواعده:**
- full-viewport operational canvas
- command surface محلية
- التركيز على flow لا على management density
- نتائج/عناصر التنفيذ أمام المستخدم أولًا
- خيارات متقدمة عند الطلب

**width authority:** `--width-operational: none`

**sticky budget:**
- 1 command surface
- 1 contextual assist أو quick status عند الضرورة

---

## 3.2 Analytical Surface
**أمثلة:** Reports، Dashboards التحليلية

**الهدف:**
- قراءة
- مقارنة
- تحليل
- filtering without clutter

**المستخدم:**
- مدير/مشرف/مستخدم تحليلي

**قواعده:**
- صفحة النتائج أهم من أدوات التحكم
- command bar واحدة فقط
- الفلاتر المتقدمة داخل drawer أو panel منضبط
- لا يجوز أن تبدأ الصفحة بمصفوفة فلاتر وأزرار قبل أن يرى المستخدم أي نتيجة

**width authority:** `--width-analytical: 1400px`

**sticky budget:**
- 1 sticky command bar فقط
- لا sticky cards متعددة فوق بعضها

---

## 3.3 Management Surface
**أمثلة:** Products، Invoices، Debts، Expenses، Accounts

**الهدف:**
- إدارة
- قائمة + إجراءات + حالة
- كثافة معلومات أعلى من POS لكن أقل من analytical overload

**قواعده:**
- page header واضح
- filter bar واحدة
- list/table/cards بحسب السياق
- actions page-level لا component-level chaos

**width authority:** `--width-management: 1600px`

**sticky budget:**
- 1 sticky filter bar فقط

---

## 3.4 Detail Surface
**أمثلة:** Invoice detail، Customer detail، Debt detail

**الهدف:**
- قراءة حالة كيان واحد بوضوح
- history + meta + actions معقولة

**width authority:** `--width-detail: 1100px`

**sticky budget:**
- 1 sticky header فقط عند الحاجة

---

## 3.5 Settings Surface
**أمثلة:** Settings، Permissions، operational configuration forms

**الهدف:**
- تعديل إعدادات
- forms واضحة
- تسلسل منظم

**width authority:** `--width-settings: 900px`

**sticky budget:**
- 0 sticky surfaces افتراضيًا

---

## 4) قواعد المنتج المشتركة

### 4.1 قاعدة “مشكلة صفحة أم مشكلة نظام؟”
قبل أي تعديل، يجب طرح هذا السؤال:
- هل المشكلة تخص الصفحة نفسها؟
- أم تخص shell/system rules؟

إذا كان الجذر:
- width
- spacing rhythm
- layer separation
- command density
- surface tone confusion
- token duplication
فهذا **ليس** patch محليًا في الصفحة.

### 4.2 قاعدة النتائج قبل الأدوات
خاصة في analytical surfaces:
- يجب أن يرى المستخدم نتيجة أو بنية النتيجة سريعًا
- لا يجوز أن تبتلع الأدوات أول viewport

### 4.3 قاعدة أوامر الصفحة الواحدة
كل صفحة تملك command surface واحدة فقط كمرجع أساسي.
الفلاتر المتقدمة أو secondary commands تخرج إلى drawer/panel منضبط.

### 4.4 قاعدة عدم تكرار الأدوار
لا يجوز وجود:
- title/header
- ثم toolbar
- ثم sub-toolbar
- ثم tabs
- ثم chips
- ثم filters
في أعلى الصفحة بدون hierarchy واضحة.

### 4.5 قاعدة الـ shell-level width
قرار width ليس قرارًا محليًا لكل صفحة.
الـ shell هو صاحب سياسة العرض، والصفحات تستهلك archetype width tokens، لا تخترع max-width من عندها.

---

## 5) القواعد الخاصة بـ POS

### 5.1 POS ليست dashboard
POS operational surface، لا analytical ولا management.

### 5.2 البيع العادي لا يحتاج عميل افتراضيًا
المسار الافتراضي:
- منتجات
- سلة
- دفع
- نجاح

### 5.3 الخصم والسلال المعلقة
بناءً على القرار التشغيلي المعتمد:
- الخصم مهم ويجب أن يكون قريبًا
- السلال المعلقة مهمة جدًا ويجب أن تكون قريبة
- لكن لا يجوز أن تحطما وضوح flow الأساسي

### 5.4 العميل/الدين
- يظهران عند الحاجة
- لا يهيمنان على المسار العادي

### 5.5 Blind POS
- لا ربح
- لا تكلفة
- لا بيانات مالية حساسة

---

## 6) القواعد الخاصة بـ Reports

Reports هي أول analytical surface سيتم إصلاحها بعد تثبيت قواعد النظام المشتركة وPOS.

### 6.1 المشكلة الحالية كما نعتبرها
- command density عالية
- filters كثيرة في أعلى الصفحة
- تقسيمات غير واضحة
- أكثر من مستوى تحكم بصري
- النتائج متأخرة بصريًا عن الأدوات

### 6.2 الشكل المستهدف
Reports يجب أن تتكوّن من:
1. Page Header
2. Optional KPI strip أو summary row
3. Analytical CommandBar واحدة
4. Results zone (charts/table/cards)
5. Advanced filters داخل drawer/panel

### 6.3 ما الذي يجب أن يكون ظاهرًا افتراضيًا؟
حد أقصى 3–4 controls أساسية، مثل:
- time range
- primary scope filter
- export action
- reset/apply behavior واضح

بقية الفلاتر تذهب إلى drawer أو panel منضبط.

### 6.4 قاعدة الـ first viewport
أول viewport في Reports يجب أن يشرح الصفحة ويُظهر بداية النتيجة، لا أن يكون مجرد أدوات.

---

## 7) القواعد البصرية العليا

### 7.1 Visual Identity authority
القيم البصرية الدقيقة لا تُخترع داخل AYA.
هي تُؤخذ من `DESIGN_SYSTEM.md`، لكن هذا العقد يفرض استخدامها بشكل صحيح.

### 7.2 Touch targets
الحد الأدنى 44px.
في operational flows، يفضَّل 48–56px للعناصر الأساسية.

### 7.3 النصوص والأرقام
- العربية line-height مريح
- الأرقام المالية أوضح من النصوص الثانوية
- الحجم المبدئي المرجعي:
  - Title: 20px
  - Body: 15px
  - Meta: 13px
- الخط العربي الأساسي: `Tajawal`
- الأرقام واللاتيني عند الحاجة: `Inter`

### 7.4 RTL قاعدة أصلية
كل layout قرار يجب أن يكون RTL-correct باستخدام logical properties.

---

## 8) القرار النهائي

**أي تنفيذ ناجح في Aya Mobile يجب أن يبدأ من archetype صحيح، width صحيح، command surface صحيحة، ثم يوزع المزايا داخل هذا الإطار — لا العكس.**
