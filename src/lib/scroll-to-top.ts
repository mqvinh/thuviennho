let scrolling: number | null = null;
export function cancelScrollToTop() {
  if (scrolling !== null) cancelAnimationFrame(scrolling);
  scrolling = null;
}
export function scrollToTop() {
  cancelScrollToTop();
  const initial = window.scrollY;
  const duration = Math.min(2200, Math.max(1600, initial * .6));
  let started: number | null = null;
  const step = (now: number) => {
    started ??= now;
    const progress = Math.min(1, (now - started) / duration);
    const eased = progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
    window.scrollTo({ top: initial * (1 - eased), behavior: "instant" });
    scrolling = progress < 1 ? requestAnimationFrame(step) : null;
  };
  scrolling = requestAnimationFrame(step);
}
