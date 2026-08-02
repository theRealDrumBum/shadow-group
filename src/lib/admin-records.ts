// Small helpers for admin write endpoints: whitelist + coerce untrusted fields.

export type FieldType = "text" | "bool" | "int" | "uuid";

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Build a record from `body`, including only fields present in `spec`. */
export function pickFields(
  body: Record<string, unknown>,
  spec: Record<string, FieldType>
): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const [key, type] of Object.entries(spec)) {
    if (!(key in body)) continue;
    const value = body[key];
    if (type === "text" || type === "uuid") {
      record[key] = typeof value === "string" && value.trim() !== "" ? value.trim() : null;
    } else if (type === "bool") {
      record[key] = Boolean(value);
    } else if (type === "int") {
      const parsed = Number.parseInt(String(value), 10);
      record[key] = Number.isFinite(parsed) ? parsed : 0;
    }
  }
  return record;
}
