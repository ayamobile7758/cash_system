export default function InventoryLoading() {
  return (
    <div className="inventory-loading" aria-busy="true" aria-label="جارٍ تحميل المخزون">
      <div className="inventory-loading__header">
        <div className="skeleton-line skeleton-line--xl" />
      </div>
      <div className="inventory-loading__tabs">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="skeleton-line skeleton-line--sm" />
        ))}
      </div>
      <div className="skeleton-card inventory-loading__panel" />
    </div>
  );
}
