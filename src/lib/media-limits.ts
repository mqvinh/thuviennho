// A Vercel Function accepts at most 4.5 MB, so leave room for transport headers.
// Local and Workers retain the existing 5 MB per-file limit.
export const MEDIA_LIMIT_MB = Number(process.env.NEXT_PUBLIC_MEDIA_LIMIT_MB || "5");
export const MEDIA_LIMIT_BYTES = MEDIA_LIMIT_MB * 1024 * 1024;
