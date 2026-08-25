"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { CARD_FORGE_GPT_URL } from "@/lib/cardsmith";
import { createOptionalClient } from "@/lib/supabase/client";

export type CommandAccess = "admin" | "member" | "guest";

const ADMIN_LINKS = [
  { href: "/command", label: "Home", exact: true },
  { href: "/command/cards", label: "Cards" },
  { href: "/command/roster", label: "Roster" },
  { href: "/command/accounts", label: "Accounts" },
  { href: "/command/events", label: "Events" },
  { href: "/command/profile-review", label: "Profiles" },
  { href: "/command/gear", label: "Gear" },
  { href: "/command/partners", label: "Sponsors" },
  { href: "/command/profile", label: "Me" },
];

const MEMBER_LINKS = [
  { href: "/command", label: "Home", exact: true },
  { href: "/command/events", label: "Events" },
  { href: "/command/profile", label: "Me" },
];

const HIDDEN = ["/command/login", "/command/set-password"];

export function CommandShell({ access }: { access: CommandAccess }) {
  const pathname = usePathname();
  const router = useRouter();

  if (HIDDEN.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return null;
  }

  const links = access === "admin" ? ADMIN_LINKS : access === "member" ? MEMBER_LINKS : [];

  async function signOut() {
    const supabase = createOptionalClient();
    if (supabase) await supabase.auth.signOut({ scope: "local" });
    router.replace("/");
    router.refresh();
  }

  return (
    <header className="command-shell">
      <Link href="/command" className="command-shell-brand">
        <Image src="/shadow_group_logo.png" width={36} height={36} alt="" />
        <span>Command</span>
      </Link>
      {links.length ? (
        <nav className="command-shell-nav" aria-label="Command modules">
          {links.map((link) => {
            const active = link.exact
              ? pathname === link.href
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={active ? "is-active" : undefined}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
      <div className="command-shell-actions">
        {access === "admin" || access === "member" ? (
          <a
            href={CARD_FORGE_GPT_URL}
            className="command-shell-site"
            target="_blank"
            rel="noreferrer noopener"
          >
            Card Forge
          </a>
        ) : null}
        <Link href="/" className="command-shell-site">Public site</Link>
        <button type="button" className="command-shell-signout" onClick={() => void signOut()} aria-label="Sign out">
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
}
