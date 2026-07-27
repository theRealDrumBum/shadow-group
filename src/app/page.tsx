import Link from "next/link";
import { ArrowRight, Crosshair, Database, Shield, Users } from "lucide-react";
import { OperatorCard } from "@/components/operator-card";
import { cards } from "@/lib/data";

const modules = [
  { title: "Operator Registry", text: "Profiles, roles, callsigns, qualifications, and the facts that shape every card.", icon: Users },
  { title: "Card Archive", text: "Browse approved cards, alternate art, revisions, and complete operator collections.", icon: Database },
  { title: "Operations", text: "A future home for events, locations, after-action reports, and team history.", icon: Crosshair }
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <Link href="/" className="brand"><span className="brand-mark"><Shield size={20} /></span><span>SHADOW GROUP</span></Link>
        <nav><a href="#registry">Registry</a><a href="#platform">Platform</a><button className="button ghost">Member Login</button></nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="kicker">SHADOW GROUP // TEAM PLATFORM</span>
          <h1>Every operator<br /><em>becomes legend.</em></h1>
          <p>A permanent archive for the team, its history, and the custom cards built from the personalities behind the kit.</p>
          <div className="actions"><a className="button primary" href="#registry">Browse the registry <ArrowRight size={17} /></a><button className="button secondary">Create an operator card</button></div>
          <div className="stats"><div><strong>03</strong><span>Cards archived</span></div><div><strong>01</strong><span>Active collection</span></div><div><strong>∞</strong><span>Bad decisions recorded</span></div></div>
        </div>
        <div className="hero-visual"><div className="target-ring ring-one" /><div className="target-ring ring-two" /><OperatorCard card={cards[0]} /></div>
      </section>

      <section id="registry" className="section">
        <div className="section-heading"><div><span className="kicker">THE ARCHIVE</span><h2>Operator Card Registry</h2><p>Approved cards and field legends, stored with their source facts and complete regeneration history.</p></div><Link href="/cards" className="text-link">View full registry <ArrowRight size={16} /></Link></div>
        <div className="card-grid">{cards.map((card) => <OperatorCard key={card.slug} card={card} />)}</div>
      </section>

      <section id="platform" className="section platform-section">
        <span className="kicker">BUILT TO EXPAND</span><h2>More than a card generator.</h2>
        <div className="module-grid">{modules.map(({ title, text, icon: Icon }) => <article className="module" key={title}><Icon /><h3>{title}</h3><p>{text}</p><span>Module planned</span></article>)}</div>
      </section>

      <footer><span>SHADOW GROUP</span><span>Built for the team. Definitely not an official Wizards product.</span></footer>
    </main>
  );
}
