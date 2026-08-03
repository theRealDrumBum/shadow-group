import Link from "next/link";
import { ArrowLeft, ExternalLink, Shield } from "lucide-react";
import { getPublicGear, getSponsorBrands, resolveGearHref, type GearItem } from "@/lib/gear";

export const dynamic = "force-dynamic";

export default async function SponsorsPage() {
  const [sponsors, gear] = await Promise.all([getSponsorBrands(), getPublicGear()]);

  const byCategory = new Map<string, GearItem[]>();
  for (const item of gear) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }

  return (
    <main>
      <header className="site-header">
        <Link href="/" className="brand"><span className="brand-mark"><Shield size={20} /></span><span>SHADOW GROUP</span></Link>
        <Link className="text-link" href="/"><ArrowLeft size={16} /> Return to HQ</Link>
      </header>
      <section className="section registry-page">
        <span className="kicker">SHADOW GROUP // PARTNERS &amp; GEAR</span>
        <h1 className="page-title">Sponsors &amp; Gear</h1>
        <p className="detail-lead">The brands that support Shadow Group and the equipment we run in the field.</p>

        {sponsors.length === 0 && gear.length === 0 ? (
          <div className="notice">Sponsor and gear listings are coming online.</div>
        ) : null}

        {sponsors.length ? (
          <div className="gear-category">
            <h2>Sponsors</h2>
            <div className="sponsor-grid">
              {sponsors.map((brand) => {
                const inner = (
                  <>
                    <div className="sponsor-logo">
                      {brand.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={brand.logo_url} alt={`${brand.name} logo`} />
                      ) : <span>{brand.name}</span>}
                    </div>
                    <div className="sponsor-body">
                      <strong>{brand.name}</strong>
                      {brand.partnership_level ? <span className="roster-role">{brand.partnership_level}</span> : null}
                      {brand.description ? <p>{brand.description}</p> : null}
                    </div>
                  </>
                );
                return brand.website_url ? (
                  <a className="sponsor-card" href={brand.website_url} target="_blank" rel="noreferrer noopener sponsored" key={brand.id}>{inner}</a>
                ) : <div className="sponsor-card" key={brand.id}>{inner}</div>;
              })}
            </div>
          </div>
        ) : null}

        {[...byCategory.entries()].map(([category, items]) => (
          <div className="gear-category" key={category}>
            <h2>{category}</h2>
            <div className="gear-grid">
              {items.map((item) => {
                const { href, sponsored } = resolveGearHref(item);
                return (
                  <div className="gear-card" key={item.id}>
                    <div className="gear-image">
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image_url} alt={item.name} />
                      ) : <span className="portrait-initials">{item.name.slice(0, 2).toUpperCase()}</span>}
                    </div>
                    <div className="gear-body">
                      <strong>{item.name}</strong>
                      <span className="gear-meta">{[item.brand?.name, item.model].filter(Boolean).join(" · ")}</span>
                      {href ? (
                        <a className="text-link" href={href} target="_blank" rel={`noreferrer noopener${sponsored ? " sponsored" : ""}`}>
                          {sponsored ? "Shop (affiliate)" : "View"} <ExternalLink size={13} />
                        </a>
                      ) : null}
                      {item.disclosure_text ? <p className="gear-disclosure">{item.disclosure_text}</p> : sponsored ? <p className="gear-disclosure">Affiliate link — we may earn a commission.</p> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
