// Shared normalization for admin operator writes. Only whitelisted fields are
// ever persisted, and values are coerced to the right shape/null.

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const TEXT_FIELDS = [
  "callsign",
  "slug",
  "display_name",
  "rank",
  "primary_role",
  "secondary_role",
  "team_role",
  "short_bio",
  "long_bio",
  "portrait_url",
  "banner_url",
  "roster_notes",
  "joined_at"
] as const;

const BOOL_FIELDS = ["is_public", "is_featured", "active"] as const;

/**
 * Build a partial operator record from an untrusted body, including only the
 * fields that were actually provided.
 */
export function buildOperatorRecord(body: Record<string, unknown>): Record<string, unknown> {
  const record: Record<string, unknown> = {};

  for (const field of TEXT_FIELDS) {
    if (field in body) {
      const value = body[field];
      record[field] = typeof value === "string" && value.trim() !== "" ? value.trim() : null;
    }
  }

  for (const field of BOOL_FIELDS) {
    if (field in body) record[field] = Boolean(body[field]);
  }

  if ("display_order" in body) {
    const parsed = Number.parseInt(String(body.display_order), 10);
    record.display_order = Number.isFinite(parsed) ? parsed : 0;
  }

  if ("gallery_urls" in body && Array.isArray(body.gallery_urls)) {
    record.gallery_urls = (body.gallery_urls as unknown[]).filter((item): item is string => typeof item === "string");
  }

  return record;
}
