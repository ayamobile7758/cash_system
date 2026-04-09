import React from "react";

export default function DashboardLoading() {
  return (
    <div className="dashboard-shell">
      <div className="dashboard-content">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar__start dashboard-topbar__context">
            <div
              className="skeleton-line skeleton-line--sm"
              style={{ width: "32px", height: "32px", borderRadius: "6px", marginBottom: 0 }}
            />
            <div className="skeleton-line skeleton-line--lg" style={{ marginBottom: 0 }} />
          </div>

          <div className="dashboard-topbar__end dashboard-topbar__actions">
            <div
              className="skeleton-line skeleton-line--sm"
              style={{ width: "32px", height: "32px", borderRadius: "6px", marginBottom: 0 }}
            />
            <div
              className="skeleton-line skeleton-line--sm"
              style={{ width: "32px", height: "32px", borderRadius: "6px", marginBottom: 0 }}
            />
            <div
              className="skeleton-line skeleton-line--sm"
              style={{ width: "40px", height: "40px", borderRadius: "8px", marginBottom: 0 }}
            />
          </div>
        </header>

        <main className="dashboard-main">
          <div className="dashboard-loading" style={{ gridTemplateColumns: "1fr" }}>
            <section className="summary-grid" aria-hidden="true">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="stat-card">
                  <div className="skeleton-line skeleton-line--sm" />
                  <div className="skeleton-line skeleton-line--xl" />
                  <div className="skeleton-line skeleton-line--lg" style={{ marginBottom: 0 }} />
                </div>
              ))}
            </section>

            <section className="detail-grid" aria-hidden="true">
              <div className="skeleton-card" style={{ gridColumn: "1 / -1", minHeight: "220px" }} />
              <div className="skeleton-card" />
              <div className="skeleton-card" />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
