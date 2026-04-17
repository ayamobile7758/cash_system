export default function ReportsLoading() {
  return (
    <div className="reports-loading" aria-busy="true" aria-label="جارٍ تحميل التقارير">
      <div className="reports-loading__header">
        <div className="skeleton-line skeleton-line--xl" />
        <div className="skeleton-line skeleton-line--sm" />
      </div>
      <div className="reports-loading__kpi-row">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="skeleton-card reports-loading__kpi" />
        ))}
      </div>
      <div className="skeleton-card reports-loading__chart" />
    </div>
  );
}
