import React from "react";

export default function DashboardLoading() {
  return (
    <div className="dashboard-shell">
      <div className="dashboard-content">
        <header className="dashboard-topbar dashboard-loading__topbar" aria-hidden="true">
          <div className="dashboard-topbar__start dashboard-topbar__context dashboard-loading__topbar-start">
            <span className="dashboard-loading__surface dashboard-loading__menu-trigger" />
            <div className="dashboard-loading__title-group">
              <span className="dashboard-loading__surface dashboard-loading__title" />
              <span className="dashboard-loading__surface dashboard-loading__subtitle" />
            </div>
          </div>

          <div className="dashboard-topbar__end dashboard-topbar__actions dashboard-loading__topbar-actions">
            <span className="dashboard-loading__surface dashboard-loading__topbar-action" />
            <span className="dashboard-loading__surface dashboard-loading__topbar-action" />
            <span className="dashboard-loading__surface dashboard-loading__account-chip" />
          </div>
        </header>

        <main className="dashboard-main" aria-busy="true" aria-label="جارٍ تحميل مساحة العمل">
          <div className="dashboard-loading">
            <section className="dashboard-loading__summary summary-grid" aria-hidden="true">
              {Array.from({ length: 4 }).map((_, index) => (
                <article key={index} className="stat-card dashboard-loading__summary-card">
                  <div className="skeleton-line skeleton-line--sm" />
                  <div className="skeleton-line skeleton-line--xl" />
                  <div className="skeleton-line skeleton-line--lg dashboard-loading__flush-line" />
                </article>
              ))}
            </section>

            <section className="dashboard-loading__body" aria-hidden="true">
              <article className="skeleton-card dashboard-loading__panel dashboard-loading__panel--primary">
                <div className="dashboard-loading__panel-header">
                  <div className="skeleton-line skeleton-line--sm" />
                  <div className="skeleton-line skeleton-line--xl" />
                </div>
                <div className="dashboard-loading__panel-chart" />
                <div className="dashboard-loading__panel-row">
                  <div className="skeleton-line skeleton-line--lg dashboard-loading__flush-line" />
                  <div className="skeleton-line skeleton-line--sm dashboard-loading__flush-line" />
                </div>
              </article>

              <div className="dashboard-loading__stack">
                <article className="skeleton-card dashboard-loading__panel">
                  <div className="dashboard-loading__panel-header">
                    <div className="skeleton-line skeleton-line--sm" />
                    <div className="skeleton-line skeleton-line--lg" />
                  </div>
                  <div className="dashboard-loading__panel-list">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="dashboard-loading__panel-row">
                        <div className="skeleton-line skeleton-line--lg dashboard-loading__flush-line" />
                        <div className="skeleton-line skeleton-line--sm dashboard-loading__flush-line" />
                      </div>
                    ))}
                  </div>
                </article>

                <article className="skeleton-card dashboard-loading__panel">
                  <div className="dashboard-loading__panel-header">
                    <div className="skeleton-line skeleton-line--sm" />
                    <div className="skeleton-line skeleton-line--lg" />
                  </div>
                  <div className="dashboard-loading__panel-list">
                    {Array.from({ length: 2 }).map((_, index) => (
                      <div key={index} className="dashboard-loading__panel-row">
                        <div className="skeleton-line skeleton-line--lg dashboard-loading__flush-line" />
                        <div className="skeleton-line skeleton-line--sm dashboard-loading__flush-line" />
                      </div>
                    ))}
                  </div>
                </article>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
