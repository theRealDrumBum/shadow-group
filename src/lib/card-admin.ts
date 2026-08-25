import { slugify } from "@/lib/operator-fields";

export function slugifyCardName(name: string) {
  return slugify(name);
}

export function optionalText(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

export function parseRules(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  }
  return [];
}

export function parseColors(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim().toUpperCase()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(/[\s,]+/).map((token) => token.trim().toUpperCase()).filter(Boolean);
  }
  return [];
}

export function rulesToText(rules: string[] | null | undefined) {
  return (rules ?? []).join("\n");
}

export function colorsToText(colors: string[] | null | undefined) {
  return (colors ?? []).join(" ");
}
