export function LoadingIndicator({ label = "Đang tải", inline = false }: { label?: string; inline?: boolean }) {
  return <span className={inline ? "loading-inline" : "loading-center"} role="status" aria-label={label}><span className="loading-spinner" aria-hidden="true" /></span>;
}
