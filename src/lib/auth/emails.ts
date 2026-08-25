/** First Command admins. Gmail dots / +tags are treated as the same mailbox. */
export const BOOTSTRAP_ADMIN_EMAILS = [
  "matt.c.ward@gmail.com",
  "matt@foundryfractional.com",
] as const;

export function canonicalizeEmail(email: string | null | undefined): string {
  if (!email) return "";
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return trimmed;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    const withoutTag = local.split("+")[0] ?? local;
    return `${withoutTag.replace(/\./g, "")}@gmail.com`;
  }
  return trimmed;
}

export function emailsEquivalent(
  left: string | null | undefined,
  right: string | null | undefined,
) {
  const a = canonicalizeEmail(left);
  const b = canonicalizeEmail(right);
  return Boolean(a) && a === b;
}

export function isBootstrapAdminEmail(email: string | null | undefined) {
  const canonical = canonicalizeEmail(email);
  return BOOTSTRAP_ADMIN_EMAILS.some((candidate) => canonicalizeEmail(candidate) === canonical);
}
