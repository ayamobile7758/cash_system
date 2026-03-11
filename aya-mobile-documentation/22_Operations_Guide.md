# آية موبايل - دليل التشغيل
## 22) Operations Guide (للمطور AI)

---

## 📋 الغرض

هذا الملف يُجيب على الأسئلة التشغيلية التي لا تُجاب في ملفات التصميم الأخرى:
- كيف يبدأ المطور من الصفر؟
- كيف تُدار الحسابات؟
- كيف يعمل الـ Backup؟
- ماذا يحدث بعد الإطلاق؟

---

## 🚀 إعداد البيئة (للمطور AI — من الصفر)

### الترتيب الإلزامي

```
1. إنشاء مشروع Supabase
2. إنشاء مشروع Vercel
3. ربطهما
4. تنفيذ Migrations (بالترتيب)
5. تشغيل Seed Data
6. اختبار محلي
```

### 1. Supabase

```
- الموقع: supabase.com → New Project
- الاسم: aya-mobile
- الخطة: Free Tier
- المنطقة: أقرب منطقة للأردن (eu-central-1 أو مشابه)
- بعد الإنشاء: احفظ هذه القيم من Settings → API:
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY  ← سري، لا يُكشف أبداً
```

### 2. Vercel

```
- الموقع: vercel.com → New Project
- اختر: Import Git Repository
- الخطة: Hobby (مجاني)
- Framework: Next.js (يُكشف تلقائياً)
- Environment Variables: أضف المتغيرات الثلاثة من Supabase
```

### 3. ملف `.env.local` (محلياً)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

> ⚠️ `.env.local` موجود في `.gitignore` — لا يُرفع على GitHub أبداً.

### 4. تنفيذ Migrations (بالترتيب)

```
supabase/migrations/
├── 001_foundation.sql              ← أولاً: الجداول والأنواع الأساسية
├── 002_operations.sql              ← ثانياً: الجداول التشغيلية
├── 003_accounting.sql              ← ثالثاً: الجداول المحاسبية
├── 004_functions_triggers.sql      ← رابعاً: الدوال والمنطق
├── 005_rls_security.sql            ← أخيراً: الأمان وRLS
```

```bash
# تشغيل محلي
npx supabase db push

# أو من Supabase Dashboard → SQL Editor
```

### 5. أوامر التشغيل المحلي

```bash
npm install
npm run dev
# يفتح على: http://localhost:3000
```

---

## 👤 إدارة المستخدمين

### إضافة مستخدم جديد

إضافة المستخدمين تتم من **Supabase Dashboard** (أحمد لا يحتاج لذكر هذا للموظف):

```
Supabase Dashboard → Authentication → Users → Add User
  - Email: موظف@example.com
  - Password: كلمة مرور مؤقتة
  - بعد الإنشاء: أضف سجل في جدول profiles:
    - id: نفس UUID من auth.users
    - full_name: اسم الموظف
    - role: 'pos_staff'  ← أو 'admin' لأحمد
    - is_active: true
```

### تغيير دور مستخدم

```sql
-- من Supabase Dashboard → SQL Editor
UPDATE profiles SET role = 'admin' WHERE id = 'USER_UUID';
```

### تعطيل حساب موظف مستقيل

```sql
-- تعطيل الحساب (لا حذف)
UPDATE profiles SET is_active = false WHERE id = 'USER_UUID';

-- في Supabase Auth → Users → [المستخدم] → Disable
```

### من يملك وصول Supabase Dashboard؟

**أحمد فقط (مالك المشروع)** — الموظف لا يحتاج لأي وصول خارج التطبيق.

---

## ⏱️ المهام المجدولة (Scheduled Jobs)

### المبدأ

النظام يعتمد على مهام مجدولة (Cron Jobs) للعمليات الآلية التي لا تعتمد على تفاعل المستخدم. تُنفّذ عبر **Vercel Cron** باستدعاء مسارات API محمية (بطريقة Server-To-Server باستخدام `SERVICE_ROLE_KEY`).

### المهام الموصى بها

| الرمز | المهمة | التوقيت | الوصف | الدالة المستدعاة |
|---|---|---|---|---|
| **T-08** | تنبيهات الديون | 8:00 صباحاً (يومياً) | فحص الديون المستحقة أو المتأخرة وإرسال إشعارات لأحمد. | `fn_detect_overdue_debts()` |
| **T-10** | فحص النزاهة | منتصف الليل (يومياً) | التحقق من تطابق أرصدة الحسابات مع قيود دفتر الأستاذ، وفحص تطابق أطراف القيد المزدوج. يُرسل إشعاراً في حال وجود خلل. | `fn_verify_balance_integrity()` |

### كيفية الإعداد (Vercel Cron)

1. إنشاء `app/api/cron/balance-check/route.ts` (و مسار مماثل للديون).
2. إضافة تعريف Cron في `vercel.json`:
   ```json
   {
     "crons": [
       { "path": "/api/cron/balance-check", "schedule": "0 0 * * *" },
       { "path": "/api/cron/detect-debts", "schedule": "0 8 * * *" }
     ]
   }
   ```
3. حماية المسار (يسمح فقط بطلبات Vercel ذات الترويسة الصحيحة).

---

## 💾 ميزة تحميل البيانات محلياً (Local Backup)

### المبدأ

لا يوجد Supabase Scheduled Backup (الخطة المجانية). بدلاً منه: **زر "تحميل نسخة احتياطية"** في صفحة الإعدادات (Admin فقط).

### ما يُصدَّر

```
aya_backup_2026-02-22.json
├── export_date: "2026-02-22T01:00:00"
├── version: "1.0"
└── tables:
    ├── products: [...]
    ├── invoices: [...]
    ├── invoice_items: [...]
    ├── payments: [...]
    ├── accounts: [...]
    ├── ledger_entries: [...]
    ├── debt_customers: [...]
    ├── debt_entries: [...]
    ├── debt_payments: [...]
    ├── returns: [...]
    ├── return_items: [...]
    ├── expenses: [...]
    ├── expense_categories: [...]
    ├── suppliers: [...]
    ├── purchase_orders: [...]
    ├── purchase_items: [...]
    ├── supplier_payments: [...]
    ├── topups: [...]
    ├── transfers: [...]
    ├── maintenance_jobs: [...]
    ├── inventory_counts: [...]
    ├── inventory_count_items: [...]
    ├── reconciliation_entries: [...]
    ├── daily_snapshots: [...]
    ├── audit_logs: [...]
    └── system_settings: [...]
```

### API Route المطلوب

```
GET /api/export/backup
  - الصلاحية: Admin فقط
  - يستدعي: service_role لقراءة جميع الجداول
  - يُرجع: JSON file download
  - اسم الملف: aya_backup_{YYYY-MM-DD}.json
```

### متى يُستخدم؟

- أسبوعياً كحد أدنى (يومياً مثالي)
- قبل أي تحديث كبير للنظام
- بعد إغلاق يوم عمل مهم

---

## 📱 واتساب — آلية wa.me

### المبدأ

لا توجد API خارجية. النظام يُنشئ رابط `wa.me` يفتح واتساب مع رسالة جاهزة. المستخدم يضغط "إرسال" يدوياً. بالتوازي، يُسجل النظام `delivery log` محليًا لأغراض التدقيق فقط بحالة baseline (`queued`) مع رقم مقنّع، دون ادعاء تأكيد تسليم من واتساب.

### الرابط

```
https://wa.me/{phone}?text={encodedMessage}
```

### معالجة الرقم تلقائياً

```javascript
function formatPhone(phone) {
  // إزالة المسافات والرموز
  let clean = phone.replace(/[\s\-\(\)\+]/g, '');
  // إزالة 00 من البداية
  if (clean.startsWith('00')) clean = clean.slice(2);
  // إزالة 0 من البداية وإضافة 962
  if (clean.startsWith('0')) clean = '962' + clean.slice(1);
  // إذا لم يبدأ بـ 962 أضفه
  if (!clean.startsWith('962')) clean = '962' + clean;
  return clean;
}
```

### متى تظهر أزرار واتساب؟

| الموقف | يظهر الزر؟ | الشرط |
|--------|-----------|-------|
| تسديد دين | ✅ | `debt_customer.phone` غير فارغ |
| دين مستحق | ✅ | `debt_customer.phone` غير فارغ |
| صيانة جاهزة | ✅ | رقم عميل الصيانة موجود |
| تحذير دين | ✅ | دائماً (هو إشعار لأحمد) |
| فاتورة بيع | ⚙️ اختياري | يحدد أحمد من الإعدادات |

### إذا كان الرقم فارغاً

زر واتساب لا يظهر. تظهر أيقونة "نسخ الرسالة" بدلاً منه.

---

## 🖥️ متطلبات الأجهزة والمتصفح

| البند | التفاصيل |
|-------|---------|
| المتصفح | Chrome/Edge/Safari/Firefox (آخر إصدارين) |
| الأجهزة | هاتف + تابلت + لابتوب + ديسكتوب |
| الاتصال | إنترنت دائم (لا Offline) |
| الدقة الدنيا | 360px عرض فعّال |
| التثبيت | مدعوم عند توفر المتصفح (A2HS / Install App) |

> المرجع المعتمد: [29_Device_Browser_Policy.md](./29_Device_Browser_Policy.md)

### ملاحظة للمطور

- استخدم breakpoints مرجعية: `360 / 768 / 1024`
- منطقة POS: مُحسَّنة للمس (أزرار ≥ 48px)
- منطقة Admin: مُحسَّنة للتابلت/الديسكتوب (جداول + تقارير)
- لا حاجة لدعم Dark Mode خاص — التصميم الداكن هو الوحيد

---

## ⚠️ قيود الخطة المجانية

| الخدمة | القيد | الأثر العملي |
|--------|-------|-------------|
| Supabase DB | 500MB | يكفي لسنوات من البيانات |
| Supabase Auth | 50,000 MAU | يكفي (مستخدمان) |
| Supabase Edge Functions | 500K استدعاء/شهر | يكفي |
| Supabase Realtime | 200 اتصال متزامن | يكفي |
| Supabase API | 2M طلب/شهر | يكفي |
| **Supabase Backup** | **❌ غير مدعوم** | **→ Backup محلي يدوي** |
| Vercel Builds | 100 بناء/شهر | يكفي |
| Vercel Bandwidth | 100GB/شهر | يكفي |

> **إذا زاد الاستخدام مستقبلاً:** Supabase Pro = $25/شهر (يشمل Backup يومي تلقائي).

---

## 🔧 ما بعد الإطلاق

### متابعة الأخطاء

- **Vercel:** Dashboard → Deployments → Functions Logs (أخطاء API Routes)
- **Supabase:** Dashboard → Logs → API Logs (أخطاء قاعدة البيانات)
- **داخل النظام:** جدول `audit_logs` يحتوي جميع العمليات الفاشلة

### تحديث النظام (نشر تغييرات)

```
1. المطور يُعدّل الكود
2. يرفعه على GitHub
3. Vercel ينشر تلقائياً (Deploy يستغرق ~1-2 دقيقة)
4. لا يوجد downtime — Vercel يستخدم Zero-Downtime deployment
```

### تحديث قاعدة البيانات (Migrations)

```
1. إنشاء ملف migration جديد مُرقّم
2. تنفيذه من Supabase Dashboard → SQL Editor
3. دائماً نسخة احتياطية قبل أي migration كبير
```

### إذا وجد خطأ في الإنتاج

```
1. اطّلع على Vercel Logs لمعرفة السبب
2. أصلح الكود محلياً
3. اختبر أن الخطأ حُل
4. ادفع التحديث على GitHub
5. Vercel ينشر تلقائياً
```

---

## 🔗 الملفات المرتبطة

- [01_Overview_Assumptions.md](./01_Overview_Assumptions.md) — الافتراضات الكاملة
- [09_Implementation_Plan.md](./09_Implementation_Plan.md) — خطة التنفيذ
- [13_Tech_Config.md](./13_Tech_Config.md) — الإعدادات التقنية التفصيلية
- [31_Execution_Live_Tracker.md](./31_Execution_Live_Tracker.md) — مرجع التنفيذ الحالي للمراحل والمهام

---

**الإصدار:** 1.0
**تاريخ الإنشاء:** 22 فبراير 2026
**الغرض:** دليل تشغيلي للمطور AI — يُكمل ما لا تجيب عنه ملفات التصميم
