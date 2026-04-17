export default function PosLoading() {
  return (
    <div className="pos-loading" aria-busy="true" aria-label="جارٍ تحميل نقطة البيع">
      <div className="pos-loading__toolbar">
        <div className="skeleton-line skeleton-line--lg" />
        <div className="skeleton-line skeleton-line--sm" />
      </div>
      <div className="pos-loading__grid">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="skeleton-card pos-loading__tile" />
        ))}
      </div>
    </div>
  );
}
