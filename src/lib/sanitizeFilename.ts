// lib/files/sanitizeFilename.ts
export const sanitizeFilename = (name: string) =>
  (name || "document").replace(/[\\/:*?"<>|]+/g, "_").trim() || "document";
