# AYA 05 — خطة التنفيذ التقنية للوكيل
## دليل عمل عملي لوكيل برمجي داخل المحرر (Codex / Agent)

---

## 1) الغرض من هذا الملف

هذا الملف لا يشرح الرؤية فقط، بل يعطي الوكيل خطة تنفيذ منضبطة مرتبطة بالكود الحالي والمشاكل الفعلية.

الهدف:
- منع big-bang rewrite
- منع كسر الدومين
- منع كسر الاختبارات
- منع التناقض بين AYA و design system والكود

---

## 2) المبدأ الأعلى

## التنفيذ يكون بهذه السلسلة فقط:
1. Audit
2. Preservation map
3. Authority sync
4. Surface extraction / refactor
5. Test-protected verification
6. Only then move forward

لا يجوز القفز مباشرة إلى كتابة JSX/CSS جديدة.

---

## 3) ما الذي يجب قراءته أولًا من الكود؟

### 3.1 POS core
- `components/pos/pos-workspace.tsx`
- كل المكونات التي يستوردها مباشرة
- store المرتبط به (مثل `stores/pos-cart.ts` أو equivalent)
- hooks الخاصة بالمنتجات والحسابات والعملاء
- types/validations المرتبطة بـ POS
- `/api/sales` وكل ما يؤثر على payload/response/errors

### 3.2 system-level files
- `app/globals.css`
- `DESIGN_SYSTEM.md`
- shell/layout files
- أي topbar context provider أو shell wrapper
- implementation الحالية لـ `SectionCard` وأي primitives UI أساسية

### 3.3 Reports عند الوصول إلى المرحلة التالية
- route page الخاصة بـ reports
- كل المكونات المستوردة منها
- API/data layer الخاص بالتقارير
- tests التي تحمي reports

---

## 4) Preservation Map إلزامي قبل أي refactor

على الوكيل أن يكتب لنفسه mapping داخليًا قبل التنفيذ ويثبت ما يلي:

### 4.1 منطق يجب الحفاظ عليه
- payment account model
- fee behavior
- split payment behavior
- customer/debt behavior
- discount behavior
- held carts behavior
- success payload behavior
- duplicate/idempotency-like behavior
- stock validation behavior
- network/error/concurrency behavior

### 4.2 Hooks/state لا يجوز تبسيطها عشوائيًا
- أي store مركزي قائم
- أي selected account(s) semantics
- أي cart hydration logic
- أي success/reset logic

### 4.3 أشياء لا يجوز حذفها بحجة التبسيط
- split payments
- held carts
- discount path
- customer/debt path
- success state
- banners/toasts

---

## 5) بروتوكول Authority Sync

قبل التنفيذ، يجب على الوكيل أن يثبت هذه العلاقة:

- **Business/domain truth** → store/API/validation code
- **Visual/token truth** → `DESIGN_SYSTEM.md`
- **Architecture/flow truth** → AYA 01 + AYA 03 + AYA 08 + AYA 02
- **Regression protection** → tests + protected strings/hooks

إذا وجد تعارضًا ظاهريًا:
1. لا يخمّن
2. لا يختار ما يبدو أسهل
3. يرجع إلى AYA 08 أولًا
4. ثم إلى code truth / design system truth بحسب نوع التعارض

---

## 6) بروتوكول حماية الاختبارات

هذه الخطوة إلزامية قبل أي refactor بصري أو بنيوي:

### 6.1 قبل تغيير أي CSS class, aria-label, visible Arabic string, DOM order مهم
نفّذ grep داخل:
- `tests/e2e/`
- `tests/unit/`
- أي docs/protected strings map إن وجد

### 6.2 القاعدة
إذا كانت class أو string أو selector محمية بالاختبارات:
- لا تغيّرها بصمت
- إما تحافظ عليها
- أو تغيّرها intentional وتحدّث الاختبارات في نفس المهمة وبشكل مبرر

### 6.3 بالنسبة لـ Reports
بما أن analytical pages عادة محمية باختبارات layout/filters/export، لا يجوز تغييرها قبل قراءة اختباراتها أولًا.

---

## 7) Migration Path المعتمد

## المرحلة 0 — توحيد المرجعية
- اقرأ AYA 00
- اقرأ AYA 08
- اقرأ `DESIGN_SYSTEM.md`
- اقرأ الملفات الأساسية للكود
- ثبّت contradictions list

## المرحلة 1 — Shell/System fixes غير المدمرة
- width policy
- command surface boundaries
- z-index semantic mapping
- section-card usage policy
- no behavioral break

## المرحلة 2 — POS toolbar decoupling
- أبقِ shell topbar shell-level
- انقل POS commands إلى local command surface
- اختبر layout / overlap / focus / responsive behavior

## المرحلة 3 — Product selection extraction
- أخرج product/search/category surface
- حافظ على add-to-cart logic
- حافظ على stock/search/category behaviors

## المرحلة 4 — Cart review extraction
- افصل cart review عن payment UI
- حافظ على quantity/remove/discount/summary/held-carts affordances

## المرحلة 5 — Payment isolation
- أنشئ payment surface مستقل
- حافظ على payment model الحالي
- لا تبسّط payload logic
- افصل basic path عن advanced path

## المرحلة 6 — Success and post-sale stabilization
- success surface
- print/view action إن وجد
- start new sale
- state reset safety

## المرحلة 7 — Reports archetype cleanup (بعد POS)
- page header
- one analytical command bar
- advanced filter drawer
- results-first viewport
- width-analytical application

---

## 8) قرار مهم جدًا بخصوص الـ state

### 8.1 لا تستبدل store الحالي بـ generic reducer جديد لمجرد النظافة
إذا كان store الحالي يحتوي على منطق domain صحيح، فاحتفظ به.

### 8.2 ما يجوز نقله إلى UI state
- active step
- drawer/modal open state
- local presentation toggles
- per-surface ephemeral UI state

### 8.3 ما يجب أن يبقى في domain/store layer
- cart data
- selected accounts
- split payments
- customer/debt state
- held carts
- discounts
- submission-safe state
- success payload data

---

## 9) قرارات ممنوعة على الوكيل

ممنوع على الوكيل أن:
- يغير payment API shape دون فحص end-to-end
- يحذف feature لأنها نادرة “على الأغلب”
- يعالج shell-level width محليًا في الصفحة
- يخلق tokens أو z-index scale ثانية
- يعيد بناء SectionCard من الصفر بلا ضرورة
- يستبدل toolbar/global layout بعشوائية
- يغير visible Arabic strings أو test hooks بصمت

---

## 10) بروتوكول التنفيذ العملي لكل مهمة

### قبل أول diff
- حدّد الملفات فعليًا
- اقرأ imports المتأثرة
- ارسم impact map
- افحص tests selectors/string dependencies

### أثناء التنفيذ
- أقل عدد تعديلات ممكن لتحقيق الهدف الصحيح
- تغييرات core أولًا ثم interface
- لا تغيّر المنطق والشكل في نفس الوقت إذا أمكن فصل المهمة

### بعد التنفيذ
- build/test حسب المتاح
- راجع diff لكل ملف
- تأكد من عدم وجود accidental API changes
- وثّق assumptions والقيود

---

## 11) القرار النهائي للوكيل

**نفّذ refactor تدريجيًا، واحمِ الدومين والاختبارات، واعتمد shell/design system كحقائق تنفيذية، ولا تُنفذ أي تبسيط يسرق ميزة تشغيلية مهمة.**

---

## 12) Token migration status — historical note

The `--aya-*` → `--color-*` migration table in `DESIGN_SYSTEM.md §9` is **historical only**.
A code-wide grep confirms zero `--aya-*` usages remain in `app/globals.css` or components.

**Implication for executors:**
- Do NOT add new `--aya-*` tokens.
- Do NOT reintroduce the old names as aliases.
- If a task brief mentions migration, treat it as already complete and move on.
- The DESIGN_SYSTEM table stays in place as a reference for historical diffs only.

---

## 13) Multi-Agent routing for this refactor

### 13.1 Codex (primary executor)
- All logic changes (store, API, validators, payment, cart, debt)
- POS phase 0 → phase 6 wiring
- Test protection grep (AYA 05 §6)
- TypeScript + vitest verification
- All migration files
- Rollback branch creation

### 13.2 Gemini (visual executor)
- Primitive UI shape (AYA 03 §8 + AYA 09)
- Visual polish after Codex wires the surface
- Arabic copy review (never rewrite without Planner approval)
- Visual regression review
- RTL review

### 13.3 Handoff rule
Codex writes the surface first (skeleton + wiring + tests green).
Gemini then refines visuals in a second pass.
**Never interleave** — one agent owns a commit at a time.

### 13.4 Planner (Claude)
- Writes Tasks in AGENTS.md / GEMINI.md Task Zone
- Never executes code directly
- Reads EXECUTION_RESULT only, not full Task echo
- Updates `ai-system/BRANCH_SUMMARY.md` after each completed Task

---

## 14) Rollback strategy — branch per phase

### 14.1 Branch naming
```
refactor/pos-phase-0-audit
refactor/pos-phase-1-shell-fixes
refactor/pos-phase-2-toolbar-decoupling
refactor/pos-phase-3-product-extraction
refactor/pos-phase-4-cart-extraction
refactor/pos-phase-5-payment-isolation
refactor/pos-phase-6-success-stabilization
refactor/reports-phase-7-archetype-cleanup
```

### 14.2 Rules
- Each phase = one branch = one PR
- No phase N branch merges until phase N−1 is on main
- Each phase branch must end green on: `tsc --noEmit` + `vitest run` + essential e2e (see §17)
- Rollback = revert the phase PR on main; earlier phases stay intact
- No rebase of phase branches onto each other — linear history

### 14.3 Per-phase checkpoint commits
Within a phase branch, commit at natural seams:
1. After Audit + Preservation Map written
2. After Authority Sync confirmed
3. After surface extraction
4. After tests green
5. Final polish commit

Revertable granularity inside a phase helps when a single surface goes wrong.

---

## 15) Phase exit criteria

A phase is **done** only when all of these are true:

### 15.1 Domain integrity
- [ ] No payment/cart/debt/held-carts behavior changed unintentionally
- [ ] `/api/sales` payload unchanged OR change documented in the phase PR
- [ ] Store public API unchanged OR change documented

### 15.2 Tests
- [ ] `npx tsc --noEmit --pretty false` → zero output
- [ ] `npx vitest run` → all pass
- [ ] Essential e2e tests (§17.1) → green
- [ ] No protected string/class renamed silently

### 15.3 AYA consistency
- [ ] Phase output matches AYA 02 §5 gold flow (POS phases)
- [ ] AYA 06 H-rules re-checked (H-01 … H-12)
- [ ] AYA 06 acceptance criteria for the touched archetype satisfied

### 15.4 Deliverables
- [ ] `ai-system/BRANCH_SUMMARY.md` updated
- [ ] Phase PR has: preservation map, diff summary, test report, rollback note
- [ ] Measurable metric values (AYA 06 §13) recorded in PR body

If any box is unchecked, the phase is **not** complete — do not start the next phase.

---

## 16) px* test naming map

Playwright e2e tests follow a `pxNN-area.spec.ts` naming scheme. Map:

| Prefix | Area | Relevance to POS refactor |
|--------|------|---------------------------|
| `smoke.spec.ts` | Route guards, metadata | **Essential every phase** |
| `device-qa.spec.ts` | Tablet device QA, POS + settings smoke | **Essential** for POS phases 2–6 |
| `px06-device-gate.spec.ts` | Device gate + UAT | **Essential** for POS phase 0 + 2 |
| `px06-uat.spec.ts` | Sales API semantics, products browser | **Essential** for payment phase 5 |
| `px11-reports.spec.ts` | Reports charts + export | Essential for phase 7 only |
| `px13-search-alerts.spec.ts` | Global search + alerts | Defer — not touched by POS |
| `px16-navigation-ia.spec.ts` | Nav inventory, drawer, bottom bar | Essential for phase 1 (shell) |
| `px18-visual-accessibility.spec.ts` | Visual + a11y snapshots | Defer to pre-merge, not per-phase |
| `px21-shell-auth.spec.ts` | Shell + auth surfaces | Essential for phase 1 (shell) |
| `px22-transactional-ux.spec.ts` | Invoices, returns, debt | **Essential** for phases 2–6 |
| `px23-operational-workspaces.spec.ts` | Products, inventory, notifications | Essential for phase 3 (product extraction) |
| `px24-analytical-config.spec.ts` | Reports, settings, portability | Essential for phase 7 only |

---

## 17) Test tiering — what to run when

**Principle:** Executors have been spending disproportionate time on full e2e runs.
This section tells them exactly which tests are **required per phase** vs **deferred to pre-merge**.

### 17.1 Tier A — Essential (run every commit inside a phase)
Fast, catches domain + type regressions immediately.
```
npx tsc --noEmit --pretty false
npx vitest run
```
Runtime budget: under 60 seconds total.

### 17.2 Tier B — Phase-relevant e2e (run before closing a phase PR)
Only the e2e files explicitly listed as "Essential" for the current phase in §16.

Examples:
- **Phase 1 (shell):** `px21-shell-auth`, `px16-navigation-ia`, `smoke`
- **Phase 2 (toolbar):** `device-qa`, `px06-device-gate`, `px22-transactional-ux`
- **Phase 3 (products):** `px23-operational-workspaces`, `px06-uat`
- **Phase 4 (cart):** `px22-transactional-ux`, `device-qa`
- **Phase 5 (payment):** `px06-uat`, `px22-transactional-ux`, `device-qa`
- **Phase 6 (success):** `px22-transactional-ux`, `smoke`
- **Phase 7 (reports):** `px11-reports`, `px24-analytical-config`, `px18-visual-accessibility`

### 17.3 Tier C — Deferred until pre-merge to main
Skip these during per-phase work; run once before merging the final phase PR of the wave:
- `px18-visual-accessibility.spec.ts` (visual regression + full a11y)
- `px13-search-alerts.spec.ts` (unrelated to POS domain)
- Any cross-browser matrix beyond Chromium
- Any test marked `@slow` or `@visual`

### 17.4 Tier D — One-shot before wave ends
Run exactly once before declaring the wave complete:
```
npm run build
npx playwright test     # full e2e suite
```

### 17.5 What the executor is forbidden from doing
- Skipping Tier A on any commit
- Running Tier C per commit "just to be safe" — wastes hours per phase
- Disabling tests to make a phase pass — broken protection is a phase failure
- Using `--no-verify` to bypass hooks

### 17.6 Planner override
If the Planner judges a phase as low-risk (e.g. pure CSS token change with no DOM impact), the Planner may explicitly waive Tier B in the Task brief. The waiver must be written in the Task itself — not negotiated in the result.
