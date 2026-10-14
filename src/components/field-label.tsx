import type { ReactNode } from "react";

export function FieldLabel({ children, required = false }: { children: ReactNode; required?: boolean }) {
  return <span className="field-label">{children}{required && <span className="required-marker" aria-hidden="true" />}</span>;
}
