export function CatalogPagination({ page, pageCount, onChange, label }: {
  page: number; pageCount: number; onChange: (page: number) => void; label: string;
}) {
  if (pageCount <= 1) return null;
  return <nav className="pagination" aria-label={label}>
    <button type="button" className="button secondary" disabled={page === 1} onClick={() => onChange(page - 1)}>← Trước</button>
    {Array.from({ length: pageCount }, (_, i) => i + 1).map(number => (
      <button type="button" key={number} className={`button ${number === page ? "" : "secondary"}`} aria-label={`Trang ${number}`} aria-current={number === page ? "page" : undefined} onClick={() => onChange(number)}>{number}</button>
    ))}
    <button type="button" className="button secondary" disabled={page === pageCount} onClick={() => onChange(page + 1)}>Sau →</button>
  </nav>;
}
