"use client";

import { useEffect, useRef, type HTMLAttributes } from "react";

// Only decorations move. Text, links and images remain visible before hydration.
export function IllustrationScene({
  as: Element = "div",
  className = "",
  ...props
}: HTMLAttributes<HTMLElement> & { as?: "div" | "section" }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      element.dataset.reveal = "visible";
      return;
    }

    element.dataset.reveal = "waiting";
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) {
        element.dataset.reveal = "visible";
        observer.disconnect();
      }
    }, { threshold: 0.08 });
    observer.observe(element);

    const finish = () => {
      if (reducedMotion.matches) {
        element.dataset.reveal = "visible";
        observer.disconnect();
      }
    };
    reducedMotion.addEventListener("change", finish);
    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", finish);
    };
  }, []);

  return <Element ref={ref} className={`illustration-scene ${className}`} {...props} />;
}
