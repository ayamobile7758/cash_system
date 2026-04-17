export default function ProductsLoading() {
  return (
    <div className="products-loading" aria-busy="true" aria-label="جارٍ تحميل المنتجات">
      <div className="products-loading__header">
        <div className="skeleton-line skeleton-line--xl" />
        <div className="skeleton-line skeleton-line--sm" />
      </div>
      <div className="products-loading__grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="skeleton-card products-loading__tile" />
        ))}
      </div>
    </div>
  );
}
