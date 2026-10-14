// Reproduce Vercel's runtime, where the Wrangler development package is absent.
export function resolve(specifier, context, nextResolve) {
  if (specifier === "wrangler" || specifier.startsWith("wrangler/")) throw new Error("Wrangler must not be loaded by the Vercel runtime.");
  return nextResolve(specifier, context);
}
