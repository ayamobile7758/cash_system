export default function InvoicesLoading() {
  return (
    <div className="invoices-loading" aria-busy="true" aria-label="جارٍ تحميل الفواتير">
      <div className="invoices-loading__header">
        <div className="skeleton-line skeleton-line--xl" />
      </div>
      <div className="invoices-loading__list">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="skeleton-card invoices-loading__row" />
        ))}
      </div>
    </div>
  );
}
