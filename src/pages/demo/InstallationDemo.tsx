import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, LayoutDashboard, Monitor, Zap } from 'lucide-react';
import './installation-demo.css';

export const DEMO_BASE = '/demo/installatiebedrijf';
export const SERVICES = [
  { name: 'Verwarming & warmtepompen', short: 'Verwarming', text: 'Een aangename temperatuur, met een installatie die bij uw woning past.', number: '01' },
  { name: 'Elektrotechniek', short: 'Elektra', text: 'Van een nieuwe groepenkast tot laadvoorzieningen. Doordacht aangesloten.', number: '02' },
  { name: 'Ventilatie & binnenklimaat', short: 'Ventilatie', text: 'Frisse lucht en een comfortabel binnenklimaat, in iedere ruimte.', number: '03' },
  { name: 'Onderhoud & service', short: 'Onderhoud', text: 'Aandacht voor uw installatie. Vandaag en op de lange termijn.', number: '04' },
];

export function InstallationDemoLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    const oldTitle = document.title;
    document.title = `${pathname.endsWith('dashboard') ? 'Beheerdashboard' : pathname.endsWith('aanvragen') ? 'Aanvraag starten' : 'Veld Installatietechniek'} · Harkas IT demo`;
    const previous = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const oldContent = previous?.content;
    const meta = previous || document.createElement('meta');
    meta.name = 'robots'; meta.content = 'noindex, nofollow';
    if (!previous) document.head.appendChild(meta);
    window.scrollTo(0, 0);
    return () => { document.title = oldTitle; if (previous) previous.content = oldContent || ''; else meta.remove(); };
  }, [pathname]);
  return <div className="installation-demo">
    <div className="id-demo-bar">
      <Link to="/" className="id-back"><ArrowLeft size={13} /> Harkas IT</Link>
      <span className="id-demo-caption"><span className="id-live-dot" /> INTERACTIEVE PRODUCTDEMO</span>
      <nav aria-label="Demo navigatie">
        <Link to={DEMO_BASE} className={!pathname.endsWith('dashboard') ? 'active' : ''}><Monitor size={14} /><span>Voorbeeldwebsite</span></Link>
        <Link to={`${DEMO_BASE}/dashboard`} className={pathname.endsWith('dashboard') ? 'active' : ''}><LayoutDashboard size={14} /><span>Beheerdashboard</span></Link>
      </nav>
    </div>
    <Outlet />
  </div>;
}

export function Brand({ light = false }: { light?: boolean }) {
  return <Link to={DEMO_BASE} className={`id-brand ${light ? 'id-brand-light' : ''}`} aria-label="Veld Installatietechniek demo, naar startpagina"><span className="id-brand-symbol"><Zap size={24} strokeWidth={2.2} /></span><span>veld<span className="id-brand-sub">INSTALLATIETECHNIEK</span></span><span className="id-brand-period">.</span></Link>;
}

function HouseIllustration() {
  return <div className="id-house-art">
    <svg viewBox="0 0 760 600" role="img" aria-labelledby="id-house-title">
      <title id="id-house-title">Architectuurillustratie van een moderne woning met warmtepomp en zonnepanelen</title>
      <defs>
        <linearGradient id="id-sky" x2="0" y2="1"><stop stopColor="#dce5e9" /><stop offset="1" stopColor="#f0ede5" /></linearGradient>
        <linearGradient id="id-wall" x2="1" y2="1"><stop stopColor="#f8f1e3" /><stop offset="1" stopColor="#d8cebc" /></linearGradient>
        <linearGradient id="id-glass" x2="1" y2="1"><stop stopColor="#526f7b" /><stop offset="1" stopColor="#253f4b" /></linearGradient>
        <pattern id="id-slats" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#a77c58"/><path d="M1 0V9" stroke="#725b46" strokeWidth="1.5"/></pattern>
      </defs>
      <rect width="760" height="600" fill="url(#id-sky)" />
      <circle cx="625" cy="95" r="55" fill="#f5f1e6" opacity=".8" />
      <path d="M0 415L760 337V600H0Z" fill="#c3c8b5"/>
      <path d="M0 540L760 460V600H0Z" fill="#b3bba7"/>
      <path d="M60 477L531 403L710 478L231 570Z" fill="#9aa49d" opacity=".45"/>
      <path d="M105 295L413 242L630 323L328 382Z" fill="#1b303b"/>
      <path d="M105 295V450L328 530V382Z" fill="#c6bca9"/>
      <path d="M328 382L630 323V465L328 530Z" fill="url(#id-wall)"/>
      <path d="M105 295L105 279L328 361L630 302V323L328 382Z" fill="#e7dfd1"/>
      <path d="M105 279L407 222L630 302L328 361Z" fill="#f0eadf"/>
      <path d="M168 282L413 238L553 289L310 337Z" fill="#284856"/>
      <g stroke="#71838a" strokeWidth="2" opacity=".85"><path d="M217 273L359 328M266 264L408 318M315 256L457 309M364 247L506 299M214 298L459 252M261 317L508 270"/></g>
      <path d="M128 320L290 378V488L128 431Z" fill="url(#id-slats)"/>
      <path d="M157 345L258 381V463L157 427Z" fill="url(#id-glass)"/>
      <g stroke="#aebbc0" strokeWidth="3"><path d="M207 363V444M157 388L258 423"/></g>
      <path d="M352 397L515 365V478L352 512Z" fill="url(#id-glass)"/>
      <path d="M432 381V495M352 452L515 420" stroke="#b9c3c4" strokeWidth="4"/>
      <path d="M537 362L601 350V467L537 481Z" fill="url(#id-slats)"/>
      <path d="M552 376L586 369V464L552 471Z" fill="#324c56"/>
      <path d="M567 408V431" stroke="#d3c5ac" strokeWidth="3"/>
      <path d="M484 489L544 477L585 493L525 507Z" fill="#87938e"/>
      <path d="M485 450L544 438V477L484 489Z" fill="#edece5"/>
      <path d="M544 438L564 447V484L544 477Z" fill="#c4cbc9"/>
      <ellipse cx="515" cy="464" rx="17" ry="14" fill="#5d7178"/><ellipse cx="515" cy="464" rx="11" ry="9" fill="none" stroke="#a4b2b5"/><path d="M505 455L526 474M504 473L525 455" stroke="#a4b2b5"/>
      <path d="M387 545L610 492L683 521L449 581Z" fill="#d7d3c8"/>
      <g stroke="#a2a99f" strokeWidth="2"><path d="M447 532L512 565M508 517L571 551M569 502L631 536"/></g>
      <g fill="#637c69"><ellipse cx="72" cy="405" rx="38" ry="24"/><ellipse cx="80" cy="385" rx="30" ry="39"/><ellipse cx="674" cy="399" rx="32" ry="49"/><ellipse cx="689" cy="428" rx="43" ry="25"/></g>
      <g fill="#8c9d7e"><ellipse cx="130" cy="466" rx="33" ry="12"/><ellipse cx="620" cy="478" rx="24" ry="13"/></g>
      <path d="M618 96H694M656 58V134" stroke="#91a4aa" strokeWidth="1"/><circle cx="656" cy="96" r="24" fill="none" stroke="#91a4aa"/>
      <text x="650" y="100" fill="#607b85" fontSize="11" fontFamily="sans-serif">N</text>
    </svg>
    <div className="id-art-label"><span className="id-live-dot" /> SLIM GEÏNTEGREERD <span>01 — WONEN</span></div>
    <div className="id-art-callout"><span className="id-callout-icon"><Zap size={18}/></span><div><strong>Comfort begint bij de basis.</strong><span>Verwarming · Elektra · Binnenklimaat</span></div></div>
  </div>;
}

export default function InstallationWebsite() {
  return <>
    <header className="id-site-header id-container"><Brand /><nav aria-label="Website navigatie"><a href="#diensten">Diensten</a><a href="#werkwijze">Onze werkwijze</a><Link className="id-btn id-btn-small" to={`${DEMO_BASE}/aanvragen`}>Aanvraag starten <ArrowUpRight size={16}/></Link></nav></header>
    <main>
      <section className="id-hero id-container">
        <div className="id-hero-copy"><p className="id-eyebrow"><span/> INSTALLATIETECHNIEK, DOORDACHT GEREGELD</p><h1>Goed geregeld.<br/>Van installatie<br/>tot <em>comfort.</em></h1><p className="id-lead">Een comfortabel huis begint met techniek die klopt. Wij denken mee, installeren zorgvuldig en houden uw installatie in goede conditie.</p><div className="id-hero-actions"><Link to={`${DEMO_BASE}/aanvragen`} className="id-btn">Bespreek uw project <ArrowUpRight size={18}/></Link><a href="#diensten" className="id-text-link">Ontdek onze diensten <ArrowUpRight size={16}/></a></div><div className="id-hero-footnote"><span>WONINGEN & BEDRIJFSPANDEN</span><span>VAN ADVIES TOT ONDERHOUD</span></div></div>
        <HouseIllustration />
      </section>
      <div className="id-values"><div className="id-container"><span><span>01</span> Eén aanspreekpunt</span><span><span>02</span> Heldere afspraken</span><span><span>03</span> Aandacht voor uw situatie</span></div></div>
      <section id="diensten" className="id-services id-container"><div className="id-section-heading"><div><p className="id-eyebrow">ONZE EXPERTISE</p><h2>Alle techniek.<br/>Eén vertrouwd adres.</h2></div><p>Een nieuwe installatie of een bestaand systeem verbeteren? We kijken naar het geheel en adviseren wat past.</p></div><div className="id-service-grid">{SERVICES.map(s => <Link key={s.number} to={`${DEMO_BASE}/aanvragen?dienst=${encodeURIComponent(s.name)}`} className="id-service-card"><div className="id-card-top"><span>{s.number} /</span><ArrowUpRight size={22}/></div><h3>{s.name}</h3><p>{s.text}</p><span className="id-card-link">Bespreek de mogelijkheden</span></Link>)}</div></section>
      <section id="werkwijze" className="id-process"><div className="id-container"><div className="id-section-heading"><div><p className="id-eyebrow">VAN VRAAG NAAR OPLOSSING</p><h2>U vertelt. Wij denken mee.</h2></div><Link to={`${DEMO_BASE}/aanvragen`} className="id-text-link">Start uw aanvraag <ArrowUpRight size={18}/></Link></div><div className="id-process-grid">{[{n:'01',title:'Vertel over uw project',text:'Beschrijf uw wensen en voeg eventueel foto’s toe. Zo hebben we direct een goed beeld.'},{n:'02',title:'Samen de juiste aanpak',text:'We bespreken uw situatie, beantwoorden uw vragen en bepalen de volgende stap.'},{n:'03',title:'Duidelijke afspraken',text:'U weet vooraf wat we gaan doen. Na uw akkoord stemmen we de planning samen af.'}].map(s=><div key={s.n}><span className="id-step-number">{s.n}</span><h3>{s.title}</h3><p>{s.text}</p></div>)}</div></div></section>
      <section className="id-cta id-container"><div><p className="id-eyebrow">EEN IDEE, EEN VRAAG OF EEN CONCREET PLAN?</p><h2>Maak ruimte voor<br/>meer comfort.</h2></div><Link to={`${DEMO_BASE}/aanvragen`} className="id-btn id-btn-white">Laten we kennismaken <ArrowUpRight size={18}/></Link></section>
    </main>
    <footer className="id-footer id-container"><Brand/><div>Veld is een fictief installatiebedrijf.<br/>Een werkende productdemo van <Link to="/">Harkas IT <ArrowUpRight size={12}/></Link>.</div><Link to={`${DEMO_BASE}/dashboard`} className="id-text-link">Bekijk de achterkant <LayoutDashboard size={16}/></Link></footer>
    <div className="id-bottom-note">Demo met fictieve gegevens · Aanvragen worden alleen in deze browser bewaard · Er worden geen e-mails verstuurd</div>
  </>;
}
