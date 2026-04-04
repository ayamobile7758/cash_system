<!--
ملخص عربي سريع:
هذا الملف يحكم Codex. دوره: منفذ فقط.
الجزء الأول ثابت (القواعد والتعليمات) — لا يُمسح أبداً.
الجزء الثاني (TASK ZONE) فيه المهمة الحالية — يُستبدل مع كل مهمة جديدة.
-->

# AGENTS.md — Codex Governance File

> **This file is for Codex only. If you are another Agent, ignore this file.**
> Read this file completely before executing any Task.

---

## 1. Project Identity

| Field | Value |
|-------|-------|
| **Project Name** | Aya Mobile (آيا موبايل) |
| **Project Type** | Retail POS System (Arabic RTL) |
| **Primary Language** | TypeScript |
| **Framework** | Next.js 15 App Router |
| **Database** | Supabase (Postgres) |
| **Package Manager** | npm |

---

## 2. Your Role

You are an **Executor only** in this system.
Claude is the **Planner** who writes your Tasks in the TASK ZONE below.
Your job: execute what is asked, report the result, then notify the user.

---

## 3. How to Work

```
STEP 1: Read the Task written in the TASK ZONE section below.
STEP 2: Execute the Task following all Rules in Section 4.
STEP 3: Write EXECUTION_RESULT in this same file, below the Task.
STEP 4: In the chat, say ONLY this phrase:
        "Operation [operation-name] complete, ready for review."
        Do NOT explain details in chat — all details go in EXECUTION_RESULT.
```

---

## 4. Rules That Must Never Be Broken

```
RULE-01: Do not change any Public API or Function Signature unless explicitly requested.
RULE-02: Do not delete any file unless explicitly requested.
RULE-03: Do not install any new Package unless explicitly requested.
RULE-04: Do not modify Schema or Database Migration files unless explicitly requested.
RULE-05: Do not touch environment files (.env, .env.local, .env.production, .env.*).
RULE-06: If you discover a problem outside Task scope, report in ISSUES_FOUND only.
RULE-07: Do not replace any existing Library with another unless explicitly requested.
RULE-08: NEVER add a new wrapper, container, or layout layer around existing elements unless
         the Task explicitly specifies the element name, className, and purpose of that wrapper.
         Stacking new divs/sections on top of existing structure causes layout regressions,
         broken tests, and z-index conflicts. If a structural change is needed and not specified,
         STOP and ask in ISSUES_FOUND — do not improvise.
```

---

## 5. Code Standards

### Formatting
- Follow ESLint / Prettier settings in project without exception.
- If none exist: match the style in the file you are editing.

### Naming
| Type | Pattern |
|------|---------|
| Variables / Functions | camelCase |
| Components / Classes | PascalCase |
| Constants | UPPER_SNAKE_CASE |
| Code files (.ts/.js) | kebab-case |
| Component files (.tsx/.jsx) | PascalCase |

### Comments
- Write only if code is not self-explanatory.
- Do not delete existing comments unless your change makes them inaccurate.

---

## 6. Execution Protocol

### Before any change:
1. Read files mentioned in Task using full paths.
2. Understand how code connects to the rest of the project.
3. If Task is ambiguous, assume most conservative interpretation.

### During execution:
1. Minimum number of modifications.
2. Preserve existing behavior except what Task explicitly asks to change.
3. Multiple files → order from Core to Interface.

### After execution:
1. If Tests exist, run them. If fail, fix once only. If fail again, report FAILED.
2. Run `git diff` on every modified file.
3. Write EXECUTION_RESULT in this file below the Task.

---

## 7. Emergency Protocol

```
If you violate any RULE (01-07):
→ STOP immediately. Do not continue.
→ Report the violation in ISSUES_FOUND with exact RULE number.
→ Set STATUS = PARTIAL.
→ Explain in BLOCKED_BY.
```

---

## 8. Infrastructure & Tooling Standing Rules

> These are standing rules for the execution environment. They apply to every Task unless the Task explicitly overrides them.

<!-- VERCEL BEST PRACTICES START -->
### Best practices for developing on Vercel

These defaults are optimized for AI coding agents (and humans) working on apps that deploy to Vercel.

- Treat Vercel Functions as stateless + ephemeral (no durable RAM/FS, no background daemons), use Blob or marketplace integrations for preserving state
- Edge Functions (standalone) are deprecated; prefer Vercel Functions
- Don't start new projects on Vercel KV/Postgres (both discontinued); use Marketplace Redis/Postgres instead
- Store secrets in Vercel Env Variables; not in git or `NEXT_PUBLIC_*`
- Provision Marketplace native integrations with `vercel integration add` (CI/agent-friendly)
- Sync env + project settings with `vercel env pull` / `vercel pull` when you need local/offline parity
- Use `waitUntil` for post-response work; avoid the deprecated Function `context` parameter
- Set Function regions near your primary data source; avoid cross-region DB/service roundtrips
- Tune Fluid Compute knobs (e.g., `maxDuration`, memory/CPU) for long I/O-heavy calls (LLMs, APIs)
- Use Runtime Cache for fast **regional** caching + tag invalidation (don't treat it as global KV)
- Use Cron Jobs for schedules; cron runs in UTC and triggers your production URL via HTTP GET
- Use Vercel Blob for uploads/media; Use Edge Config for small, globally-read config
- If Enable Deployment Protection is enabled, use a bypass secret to directly access them
- Add OpenTelemetry via `@vercel/otel` on Node; don't expect OTEL support on the Edge runtime
- Enable Web Analytics + Speed Insights early
- Use AI Gateway for model routing, set AI_GATEWAY_API_KEY, using a model string (e.g. 'anthropic/claude-sonnet-4.6'), Gateway is already default in AI SDK
  needed. Always curl https://ai-gateway.vercel.sh/v1/models first; never trust model IDs from memory
- For durable agent loops or untrusted code: use Workflow (pause/resume/state) + Sandbox; use Vercel MCP for secure infra access
<!-- VERCEL BEST PRACTICES END -->

### Antigravity Terminal Usage Rules (CRITICAL)
- **Do NOT block the main Agent loop**: Whenever you execute a long-running terminal command (e.g., `npm run dev`, `npm start`, watchers), you MUST run it asynchronously in the background so that the agent interaction does not freeze. Use the `WaitMsBeforeAsync` parameter effectively.
- **Avoid Hanging on Prompts**: Anticipate terminal commands that require user input. Bypass them automatically (e.g., using `-y` flags) or run them in the background to prevent the agent from getting stuck waiting indefinitely.

---
---

# ═══════════════════════════════════════════
# ═══ TASK ZONE — Content below is replaced with each new Task ═══
# ═══════════════════════════════════════════

```
TASK_ID        : 2026-04-05-001
TASK_TYPE      : refactor
PROJECT        : Aya Mobile
ROUTED_TO      : Codex
ROUTING_REASON : Complete navigation architecture change — sidebar → Mega Popover. This is a behavior/layout change touching component logic, CSS, and state management. Codex governs all behavior changes.
DEPENDS_ON     : NONE
```

GOAL             :
  Replace the persistent sidebar (dashboard-sidebar / dashboard-layout__sidebar) with a
  Mega Popover that appears when the user clicks the existing "فتح القائمة" button in the topbar.
  The sidebar must be completely removed from the DOM at all viewport sizes.
  On mobile (≤767px) the popover renders as a bottom sheet anchored to the bottom of the screen.
  On tablet (768px–1023px) and desktop (≥1024px) it renders as a wide dropdown panel below the topbar button.
  The bottom bar (dashboard-bottom-bar) on mobile is KEPT as-is — only the sidebar is replaced.

FILES_IN_SCOPE   :
  - c:\Users\Qaysk\OneDrive\Desktop\Aya Mobile\components\dashboard\dashboard-shell.tsx
  - c:\Users\Qaysk\OneDrive\Desktop\Aya Mobile\app\globals.css

CONTEXT_FILES    :
  - c:\Users\Qaysk\OneDrive\Desktop\Aya Mobile\tests\e2e\px21-shell-auth.spec.ts
  - c:\Users\Qaysk\OneDrive\Desktop\Aya Mobile\tests\e2e\px16-navigation-ia.spec.ts
  - c:\Users\Qaysk\OneDrive\Desktop\Aya Mobile\tests\e2e\px18-visual-accessibility.spec.ts
  - c:\Users\Qaysk\OneDrive\Desktop\Aya Mobile\tests\unit\pos-workspace.test.tsx

IMPLEMENTATION_SPEC :

  ## Step 1 — Read every test file in CONTEXT_FILES in full before touching any code.

  ## Step 2 — Identify all CSS classes and aria-labels that e2e tests reference on the sidebar.
  Grep tests/e2e/ for: dashboard-sidebar, dashboard-layout__sidebar, dashboard-layout--menu-open,
  dashboard-mobile-backdrop, dashboard-menu-toggle, dashboard-menu-close.
  For each match: note the assertion type (visible / hidden / aria / count).

  ## Step 3 — Implement the Mega Popover in dashboard-shell.tsx

  ### 3a. State
  - Keep `isMenuOpen` state — it now controls the Mega Popover, not the sidebar.
  - Keep `openMenu()` and `closeMenu()` functions unchanged.
  - Keep `isMobileViewport` state and its mediaQuery listener unchanged.

  ### 3b. Remove the <aside> block entirely from JSX.
  - Remove the entire `<aside className="dashboard-sidebar ...">` element and all its children.
  - Remove `dashboard-mobile-backdrop` div (it was only needed to close the sidebar).

  ### 3c. Add Mega Popover
  Insert a new element directly AFTER the topbar `<header>` opening `<div className="dashboard-topbar__start ...">` block, wrapping it as a relative container:

  **Popover structure (add inside the topbar start div, wrapping the menu toggle button):**
  ```tsx
  <div className="dashboard-nav-trigger" aria-label="فتح القائمة">
    <button
      type="button"
      className="icon-button dashboard-menu-toggle"
      onClick={openMenu}
      aria-label="فتح القائمة"
      aria-expanded={isMenuOpen}
      aria-haspopup="dialog"
    >
      <Menu size={18} />
    </button>

    {isMenuOpen && (
      <>
        <div
          className="dashboard-nav-backdrop"
          onClick={closeMenu}
          aria-hidden="true"
        />
        <div
          className={[
            "dashboard-nav-popover",
            isMobileViewport ? "dashboard-nav-popover--sheet" : "dashboard-nav-popover--dropdown"
          ].join(" ")}
          role="dialog"
          aria-label="التنقل داخل مساحات التشغيل"
          aria-modal="true"
        >
          <div className="dashboard-nav-popover__header">
            <Link href={homeHref} className="dashboard-brandmark" onClick={closeMenu}>
              <span className="dashboard-brandmark__logo">Aya</span>
              <span className="dashboard-brandmark__copy">
                <strong>Aya Mobile</strong>
                <small>{roleLabel}</small>
              </span>
            </Link>
            <button
              type="button"
              className="icon-button dashboard-menu-close"
              onClick={closeMenu}
              aria-label="إغلاق القائمة"
            >
              <X size={18} />
            </button>
          </div>

          <nav
            className="dashboard-nav-popover__nav"
            aria-label="التنقل داخل مساحات التشغيل"
          >
            {(Object.keys(groupedNavigation) as DashboardNavGroup[]).map((groupKey) =>
              groupedNavigation[groupKey].length > 0 ? (
                <section
                  key={groupKey}
                  className={`dashboard-nav-group dashboard-nav-group--${groupKey}`}
                >
                  <div className="dashboard-nav-group__items">
                    {groupedNavigation[groupKey].map((item) => {
                      const isActive = isPathActive(pathname, item.href);
                      const Icon = getIcon(item.icon);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={isActive ? "dashboard-nav__item is-active" : "dashboard-nav__item"}
                          aria-current={isActive ? "page" : undefined}
                          onClick={closeMenu}
                        >
                          <span className="dashboard-nav__icon"><Icon size={18} /></span>
                          <span className="dashboard-nav__label">
                            {item.label}
                            {item.href === "/notifications" && unreadNotifications > 0 ? (
                              <span className="dashboard-nav__badge">{unreadNotifications}</span>
                            ) : null}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ) : null
            )}
          </nav>

          <div className="dashboard-nav-popover__footer">
            {isAuthenticated ? (
              <>
                <div className="dashboard-sidebar__account" title={accountLabel}>
                  <span className="dashboard-sidebar__account-avatar" aria-hidden="true">
                    {accountInitials}
                  </span>
                  <span className="dashboard-sidebar__account-copy">
                    <strong>{roleLabel}</strong>
                    <small>{accountLabel}</small>
                  </span>
                </div>
                <LogoutButton />
              </>
            ) : (
              <Link href="/" className="secondary-button" onClick={closeMenu}>
                تسجيل الدخول
              </Link>
            )}
          </div>
        </div>
      </>
    )}
  </div>
  ```

  ### 3d. Root div classes
  - Remove `dashboard-shell--sidebar` from the root div class list.
  - Remove `dashboard-layout--menu-open` from the root div class list (no longer needed).
  - Keep all other classes: `dashboard-shell`, `dashboard-layout`, `dashboard-shell--pos`, `dashboard-layout--pos`, `dashboard-shell--offline`.

  ### 3e. Content area
  - Remove `dashboard-layout__sidebar` and `dashboard-layout__content` grid references — the layout is now full-width.
  - The `<div className="dashboard-content ...">` should use only `dashboard-content` (drop `dashboard-layout__content`).

  ## Step 4 — CSS changes in app/globals.css

  ### 4a. Remove or nullify sidebar layout rules
  Remove (or comment out) only these layout classes that are no longer used:
  - `.dashboard-layout` grid columns rule (the one that defined sidebar width + content area)
  - `.dashboard-layout__sidebar`
  - `.dashboard-layout__content`
  - `.dashboard-sidebar` and all its child rules (`.dashboard-sidebar__brand`, `.dashboard-sidebar__nav`, `.dashboard-sidebar__footer`, `.dashboard-sidebar__account`, `.dashboard-sidebar__close`, `.dashboard-sidebar--compact`, `.dashboard-sidebar--pos`)
  - `.dashboard-mobile-backdrop`
  - `.dashboard-layout--menu-open` modifier
  - `.dashboard-shell--sidebar` modifier

  Keep ALL other layout classes untouched.

  ### 4b. Add Mega Popover CSS
  Add the following new rules at the END of globals.css (before any media query overrides if they exist, otherwise at the very end):

  ```css
  /* ── Mega Popover Navigation ── */
  .dashboard-nav-trigger {
    position: relative;
  }

  .dashboard-nav-backdrop {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(15, 23, 42, 0.35);
  }

  .dashboard-nav-popover {
    position: absolute;
    inset-inline-start: 0;
    top: calc(100% + 8px);
    z-index: 201;
    background: var(--aya-panel);
    border: 1px solid var(--aya-line);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(15, 23, 42, 0.14);
    width: clamp(280px, 92vw, 560px);
    max-height: 80vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .dashboard-nav-popover__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--sp-4) var(--sp-4) var(--sp-3);
    border-bottom: 1px solid var(--aya-line);
    flex-shrink: 0;
  }

  .dashboard-nav-popover__nav {
    flex: 1;
    overflow-y: auto;
    padding: var(--sp-3) var(--sp-2);
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
  }

  .dashboard-nav-popover__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-3);
    padding: var(--sp-3) var(--sp-4);
    border-top: 1px solid var(--aya-line);
    flex-shrink: 0;
  }

  /* Mobile: bottom sheet */
  .dashboard-nav-popover--sheet {
    position: fixed;
    inset-inline-start: 0;
    inset-inline-end: 0;
    bottom: 0;
    top: auto;
    width: 100%;
    max-width: 100%;
    border-radius: 16px 16px 0 0;
    max-height: 85vh;
  }

  /* Tablet/Desktop: dropdown */
  .dashboard-nav-popover--dropdown {
    /* inherits base .dashboard-nav-popover styles — no override needed */
  }
  ```

  ### 4c. Fix dashboard-layout to full-width
  The `.dashboard-layout` rule previously defined a CSS grid with sidebar column.
  Replace it with a simple block/flex layout:
  ```css
  .dashboard-layout {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    width: 100%;
  }
  ```

  ## Step 5 — Verify test compatibility
  After implementing, grep tests/e2e/ for every class name you removed.
  If any test asserts `.toBeVisible()` or `expect(locator).toHaveCount(...)` on a removed class,
  STOP and report in ISSUES_FOUND. Do not silently break the test.

  Specifically check for:
  - `dashboard-sidebar` — if found in e2e, note exact file + line.
  - `dashboard-layout--menu-open` — if found in e2e, note exact file + line.
  - `dashboard-mobile-backdrop` — if found in e2e, note exact file + line.
  - `dashboard-layout__sidebar` — if found in e2e, note exact file + line.

  If any are test LOCATORS (used in `.locator()` or `page.locator()` calls), stop and escalate.
  If they appear only in comments or string literals inside `expect(...)` message args, they are safe to remove.

DONE_IF          :
  - The `<aside>` element is gone from the JSX completely.
  - Clicking the "فتح القائمة" button opens the Mega Popover.
  - Clicking outside (backdrop) closes it.
  - On mobile breakpoint (≤767px) the popover has class `dashboard-nav-popover--sheet` (bottom-anchored).
  - On desktop (≥768px) it has class `dashboard-nav-popover--dropdown`.
  - All existing nav links, groups, badges, account chip, logout button are present inside the popover.
  - `npx tsc --noEmit --pretty false` prints zero output.
  - `npx vitest run` passes (unit tests in tests/unit/ are not broken).
  - No regressions on unit tests in tests/unit/.
  - NOTE: e2e tests in px21-shell-auth.spec.ts that reference .dashboard-sidebar and .dashboard-layout__sidebar will fail after this change — this is EXPECTED and intentional. The Planner has decided e2e tests will be updated in a separate dedicated task after all UI changes are complete. Do NOT block on this.

DO_NOT_TOUCH     :
  - The bottom bar (`.dashboard-bottom-bar`) — keep completely unchanged.
  - The topbar structure except: replace the raw `<button className="dashboard-menu-toggle">` with the `<div className="dashboard-nav-trigger">` wrapper that contains it.
  - All `dashboard-nav__item`, `dashboard-nav__icon`, `dashboard-nav__label`, `dashboard-nav__badge`, `dashboard-nav-group`, `dashboard-nav-group__items` classes — keep identical, they move into the popover.
  - `dashboard-sidebar__account`, `dashboard-sidebar__account-avatar`, `dashboard-sidebar__account-copy` — keep class names, they move into the popover footer.
  - `dashboard-brandmark`, `dashboard-brandmark__logo`, `dashboard-brandmark__copy` — keep class names.
  - `dashboard-menu-toggle`, `dashboard-menu-close` — keep class names on their respective buttons.
  - `dashboard-topbar`, `dashboard-topbar__start`, `dashboard-topbar__end`, `dashboard-topbar__context`, `dashboard-topbar__actions` — no change.
  - `dashboard-content` class on the content wrapper.
  - `dashboard-shell`, `dashboard-shell--offline`, `dashboard-shell--pos` classes on root div.
  - tests/e2e/** — no edits.
  - tests/unit/** — no edits.

ESCALATE_IF      :
  - `npx tsc --noEmit` produces errors.
  - The `dashboard-nav-trigger` relative positioning breaks the popover placement on RTL layout.
  - NOTE: Do NOT escalate for e2e test failures on .dashboard-sidebar or .dashboard-layout__sidebar — these are known and accepted breakages to be fixed in a later dedicated e2e-update task.

CONSTRAINT       :
  - RTL-safe: use `inset-inline-start` / `inset-inline-end` not `left` / `right` in all new CSS.
  - No new npm packages.
  - No dark mode CSS.
  - Commit message format: `refactor(shell): replace sidebar with mega popover navigation`

═══ EXECUTION_RESULT ═══

  1. PRE_COMMIT    :
                    Not created.
  2. STATUS        :
                    PARTIAL
  3. REPORT        :
                    Implemented the Mega Popover navigation in `components/dashboard/dashboard-shell.tsx` and removed the sidebar structure from the rendered shell.
                    Changes completed:
                    - Removed the `<aside>` sidebar block and the mobile backdrop from JSX.
                    - Kept `isMenuOpen`, `openMenu()`, `closeMenu()`, and the existing mobile viewport listener unchanged.
                    - Wrapped the existing topbar menu button with `dashboard-nav-trigger` and rendered the new dialog/popover from that trigger.
                    - Moved all grouped navigation links, notification badge, brand mark, account chip, and logout action into the popover.
                    - Removed `dashboard-shell--sidebar`, `dashboard-layout--menu-open`, and `dashboard-layout__content` usage from the shell markup.
                    - Reworked `app/globals.css` so `.dashboard-layout` is full-width flex layout instead of sidebar grid layout.
                    - Removed sidebar/backdrop/shell-sidebar responsive behavior and added the new `dashboard-nav-trigger`, `dashboard-nav-backdrop`, and `dashboard-nav-popover*` rules.
                    - Preserved the mobile bottom bar unchanged.
                    Step 2 selector scan results in `tests/e2e/`:
                    - `dashboard-sidebar` -> `tests/e2e/px21-shell-auth.spec.ts:77` -> active locator -> `toBeVisible()`
                    - `dashboard-layout__sidebar` -> `tests/e2e/px21-shell-auth.spec.ts:100` -> active locator -> `toBeVisible()`
                    - `dashboard-layout--menu-open` -> no active matches
                    - `dashboard-mobile-backdrop` -> no active matches
                    - `dashboard-menu-toggle` -> no active matches
                    - `dashboard-menu-close` -> no active matches
                    Verification:
                    - `npx tsc --noEmit --pretty false` produced zero output.
                    - `tests/unit/pos-workspace.test.tsx` passed inside `npx vitest run`.
  4. ISSUES_FOUND  :
                    Unrelated pre-existing unit test failures remain outside this task’s scope:
                    - `tests/unit/formatters.test.ts > formatters > formats currency using the configured locale`
                    - `tests/unit/formatters.test.ts > formatters > formats compact numbers using the configured locale`
                    These compare Arabic-Indic digit expectations with Latin-digit formatter output and are not caused by the shell navigation refactor.
  5. DIFF_LOG      :
     ```diff
     diff --git a/components/dashboard/dashboard-shell.tsx b/components/dashboard/dashboard-shell.tsx
     @@
     -  const showMobileBackdrop = isMenuOpen && isMobileViewport;
     -  "dashboard-shell--sidebar"
     -  isMenuOpen ? "dashboard-layout--menu-open" : ""
     -  <aside className="dashboard-sidebar dashboard-layout__sidebar ...">
     -  <div className="dashboard-content dashboard-layout__content">
     +  <div className="dashboard-nav-trigger" aria-label="فتح القائمة">
     +    <button className="icon-button dashboard-menu-toggle" aria-haspopup="dialog" ... />
     +    {isMenuOpen ? (
     +      <>
     +        <div className="dashboard-nav-backdrop" onClick={closeMenu} aria-hidden="true" />
     +        <div className={[ "dashboard-nav-popover", isMobileViewport ? "dashboard-nav-popover--sheet" : "dashboard-nav-popover--dropdown" ].join(" ")} role="dialog" aria-modal="true">
     +          ...
     +        </div>
     +      </>
     +    ) : null}
     +  </div>
     +  <div className="dashboard-content">

     diff --git a/app/globals.css b/app/globals.css
     @@
     -.dashboard-layout,
     -.dashboard-shell { display: grid; ... }
     -.dashboard-layout--sidebar,
     -.dashboard-shell--sidebar { ... }
     -.dashboard-sidebar { ... }
     -.dashboard-mobile-backdrop { ... }
     -.dashboard-sidebar.is-open { ... }
     +.dashboard-shell { gap: 0; min-height: 100vh; }
     +.dashboard-layout {
     +  display: flex;
     +  flex-direction: column;
     +  min-height: 100dvh;
     +  width: 100%;
     +}
     +.dashboard-nav-trigger { position: relative; }
     +.dashboard-nav-backdrop { position: fixed; inset: 0; z-index: 200; ... }
     +.dashboard-nav-popover { position: absolute; inset-inline-start: 0; top: calc(100% + 8px); ... }
     +.dashboard-nav-popover--sheet { position: fixed; inset-inline-start: 0; inset-inline-end: 0; bottom: 0; ... }
     +.dashboard-nav-popover--dropdown { /* inherits base styles */ }
     ```
  6. BLOCKED_BY    :
                    `npx vitest run` is not fully green because of the unrelated formatter failures listed in ISSUES_FOUND.
                    The navigation refactor is implemented and type-safe, but full-suite signoff remains blocked by those existing formatter expectations.
  7. FINAL_NOTE    :
                    Known e2e locator breakage on `.dashboard-sidebar` and `.dashboard-layout__sidebar` was accepted by the updated task instructions and did not block execution.
