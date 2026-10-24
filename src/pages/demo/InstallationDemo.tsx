import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, LayoutDashboard, Menu, Monitor, Plus, ShieldCheck, ThermometerSun, Wind, Wrench, X, Zap } from 'lucide-react';
import './installation-demo.css';
import './installation-website.css';

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

const expertise = [
  { icon: ThermometerSun, title: 'Warmte die bij u past.', description: 'Een warmtepomp, cv-installatie of vloerverwarming? We beginnen bij uw woning, uw gebruik en uw wensen. Zo kiest u een oplossing die ook op de lange termijn klopt.', items: ['Warmtepompen & cv-installaties', 'Vloerverwarming & regeling'] },
  { icon: Zap, title: 'Klaar voor meer vermogen.', description: 'Een keuken verbouwen, elektrisch rijden of uw meterkast vernieuwen. We zorgen voor een doordachte elektrische installatie die aansluit op uw plannen.', items: ['Groepenkasten & aansluitingen', 'Laadvoorzieningen & verlichting'] },
  { icon: Wind, title: 'Frisse lucht. Fijn wonen.', description: 'Goede ventilatie maakt het verschil in huis. We kijken naar luchttoevoer, afvoer en de bestaande installatie voor een prettiger binnenklimaat.', items: ['Mechanische ventilatie & WTW', 'Inregeling & verbetering'] },
  { icon: Wrench, title: 'Aandacht houdt het werkend.', description: 'Een installatie verdient aandacht, ook na oplevering. Met gericht onderhoud, controles en duidelijke uitleg houden we uw systeem in goede conditie.', items: ['Periodiek onderhoud & inspectie', 'Service & optimalisatie'] },
];

const questions = [
  { q: 'Ik weet nog niet welke installatie ik nodig heb. Kan ik al een aanvraag doen?', a: 'Zeker. Vertel wat u wilt verbeteren, bijvoorbeeld het comfort in huis, de verwarming of uw elektrische installatie. Een eerste idee is genoeg om het gesprek te beginnen.' },
  { q: 'Kunnen jullie verschillende werkzaamheden combineren?', a: 'Ja. Verwarming, elektra en ventilatie hebben veel met elkaar te maken. Bij een verbouwing of verduurzaming bekijken we de onderdelen in samenhang en bespreken we één aanpak.' },
  { q: 'Wat gebeurt er nadat ik een aanvraag heb ingediend?', a: 'We bekijken uw beschrijving en eventuele foto’s. Daarna bespreken we de situatie en bepalen we of extra informatie of een opname op locatie nodig is. Werkzaamheden beginnen pas na duidelijke afspraken en uw akkoord.' },
  { q: 'Hoe werkt deze voorbeeldwebsite?', a: 'Veld is een fictief installatiebedrijf. U kunt het aanvraagformulier proberen met voorbeeldgegevens en de aanvraag daarna terugvinden in het beheerdashboard. Alles blijft in uw eigen browser; er wordt geen e-mail verstuurd.' },
];

export default function InstallationWebsite() {
  const [activeService, setActiveService] = useState<number | null>(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const requestUrl = `${DEMO_BASE}/aanvragen`;

  return <div className="veld-site">
    <a className="v-skip" href="#veld-content">Naar de inhoud</a>
    <header className="v-header v-container" onKeyDown={event => {
      if (event.key === 'Escape' && menuOpen) {
        setMenuOpen(false);
        menuToggleRef.current?.focus();
      }
    }}>
      <Brand />
      <button ref={menuToggleRef} className="v-menu-toggle" type="button" aria-label={menuOpen ? 'Menu sluiten' : 'Menu openen'} aria-expanded={menuOpen} aria-controls="veld-navigation" onClick={() => setMenuOpen(open => !open)}>{menuOpen ? <X size={24} /> : <Menu size={24} />}</button>
      <nav id="veld-navigation" className={`v-navigation ${menuOpen ? 'v-navigation-open' : ''}`} aria-label="Website navigatie">
        <a href="#diensten" onClick={() => setMenuOpen(false)}>Onze expertise</a>
        <a href="#projecten" onClick={() => setMenuOpen(false)}>Projecten</a>
        <a href="#over-veld" onClick={() => setMenuOpen(false)}>Over Veld</a>
        <Link className="v-button v-button-small" to={requestUrl}>Bespreek uw project <ArrowUpRight size={17} /></Link>
      </nav>
    </header>

    <main id="veld-content">
      <section className="v-hero" aria-labelledby="veld-hero-heading">
        <div className="v-hero-copy">
          <p className="v-eyebrow"><span /> DOORDACHTE TECHNIEK. ELKE DAG COMFORT.</p>
          <h1 id="veld-hero-heading">Techniek die<br />werkt. Comfort<br />dat <span>blijft.</span></h1>
          <p className="v-hero-intro">Van de eerste plannen tot de laatste afstelling. Wij brengen warmte, elektra en binnenklimaat samen in een installatie die voor u werkt.</p>
          <div className="v-hero-actions">
            <Link to={requestUrl} className="v-button">Bespreek uw project <ArrowUpRight size={19} /></Link>
            <a href="#diensten" className="v-hero-discover">Ontdek Veld <ArrowDown size={16} /></a>
          </div>
          <div className="v-hero-bottom"><span className="v-status-dot" /> VOOR WONINGEN & BEDRIJFSPANDEN</div>
        </div>
        <div className="v-hero-visual">
          <img src="/demo/veld/woning-comfort.webp" alt="Moderne woning met warme verlichting, houten gevel en een discreet geplaatste warmtepomp" width="1536" height="1024" fetchPriority="high" />
          <div className="v-photo-label"><span className="v-photo-cross">+</span> RUIMTE VOOR GOED WONEN.</div>
          <div className="v-hero-caption"><span>U voelt het verschil.</span><p>De techniek op de achtergrond.<br />Het comfort op de voorgrond.</p><ArrowUpRight size={26} /></div>
          <span className="v-image-reference">VELD / WONEN & COMFORT</span>
        </div>
      </section>

      <div className="v-promises v-container">
        <div><ShieldCheck size={22} /><span>Heldere afspraken.<small>Vooraf weten waar u aan toe bent.</small></span></div>
        <div><Wrench size={22} /><span>Van advies tot onderhoud.<small>Alle aandacht voor uw installatie.</small></span></div>
        <div><Check size={23} /><span>Eén team. Korte lijnen.<small>Een vertrouwd aanspreekpunt.</small></span></div>
      </div>

      <section id="diensten" className="v-expertise v-section">
        <div className="v-container">
          <div className="v-section-heading"><div><p className="v-eyebrow">01 / ONZE EXPERTISE</p><h2>Alles grijpt in elkaar.<br />Wij zorgen dat het klopt.</h2></div><p>Een huis is meer dan losse installaties. Daarom kijken we verder dan de vraag alleen. Naar hoe u woont, werkt en vooruit wilt.</p></div>
          <div className="v-expertise-grid">
            <div className="v-service-list">{SERVICES.map((service, index) => {
              const entry = expertise[index];
              const Icon = entry.icon;
              const expanded = activeService === index;
              return <article className={`v-service ${expanded ? 'v-service-active' : ''}`} key={service.number}>
                <h3><button type="button" aria-expanded={expanded} aria-controls={`veld-service-${index}`} onClick={() => setActiveService(expanded ? null : index)}><span className="v-service-number">{service.number}</span><Icon size={23} strokeWidth={1.5} /><span>{service.name}</span><Plus className="v-service-plus" size={22} /></button></h3>
                <div id={`veld-service-${index}`} hidden={!expanded} className="v-service-body"><p>{entry.description}</p><ul>{entry.items.map(item => <li key={item}><Check size={14} />{item}</li>)}</ul><Link to={`${requestUrl}?dienst=${encodeURIComponent(service.name)}`} className="v-inline-link">Bespreek de mogelijkheden <ArrowUpRight size={17} /></Link></div>
              </article>;
            })}</div>
            <figure className="v-expertise-photo"><img src="/demo/veld/vakmanschap.webp" alt="Installatiemonteur controleert zorgvuldig een verwarmingsinstallatie in een lichte technische ruimte" width="1536" height="1024" loading="lazy" /><figcaption><span className="v-detail-icon"><Wrench size={22} strokeWidth={1.5} /></span><div><span>HET VERSCHIL ZIT IN DE DETAILS.</span><strong>Vakwerk, tot de laatste afstelling.</strong></div></figcaption></figure>
          </div>
        </div>
      </section>

      <section id="projecten" className="v-projects v-container v-section">
        <div className="v-section-heading"><div><p className="v-eyebrow">02 / VAN PLAN NAAR PRAKTIJK</p><h2>Zo ziet vooruitgang eruit.</h2></div><p>Een blik op de mogelijkheden.<br />Dit project is een fictief voorbeeld, speciaal voor deze demo.</p></div>
        <article className="v-project-feature">
          <div className="v-project-image"><img src="/demo/veld/warmtepomp-project.webp" alt="Zorgvuldig geplaatste warmtepomp naast een moderne bakstenen gevel met houten afwerking" width="1536" height="1024" loading="lazy" /><span className="v-project-tag">VOORBEELDPROJECT / VERDUURZAMEN</span></div>
          <div className="v-project-copy"><span className="v-project-index">PROJECT / 001</span><h3>Een volgende stap.<br />Een warmer thuis.</h3><p>Een bestaande woning voorbereiden op een andere manier van verwarmen. Met aandacht voor de plek van de warmtepomp, de aansluiting en het comfort binnen.</p><dl><div><dt>De vraag</dt><dd>Verduurzamen met behoud van comfort.</dd></div><div><dt>De aanpak</dt><dd>Installatie, regeling en elektra als één geheel.</dd></div></dl><Link to={`${requestUrl}?dienst=${encodeURIComponent(SERVICES[0].name)}`} className="v-inline-link">Wat kan er bij u? <ArrowUpRight size={18} /></Link></div>
        </article>
      </section>

      <section id="over-veld" className="v-about">
        <div className="v-about-inner v-container"><div><p className="v-eyebrow">DE MENSEN ACHTER DE TECHNIEK</p><h2>Goed werk begint<br />met <span>goed luisteren.</span></h2></div><div className="v-about-copy"><p>U hoeft niet alles van techniek te weten. Daar zijn wij voor.</p><p>We vertalen uw wensen naar een plan dat u begrijpt. Denken mee over wat nodig is. Werken zorgvuldig en leggen uit hoe alles werkt. Dat is voor ons goed installatiewerk.</p><a href="#werkwijze" className="v-inline-link">Zo werken we samen <ArrowDown size={17} /></a></div></div>
        <div className="v-about-watermark" aria-hidden="true">veld.</div>
      </section>

      <section id="werkwijze" className="v-process v-container v-section">
        <div className="v-section-heading"><div><p className="v-eyebrow">03 / VANDAAG EEN VRAAG. STRAKS EEN OPLOSSING.</p><h2>Een duidelijk plan.<br />Van begin tot geregeld.</h2></div><Link to={requestUrl} className="v-inline-link">Zet de eerste stap <ArrowUpRight size={18} /></Link></div>
        <ol className="v-process-list">{[
          { title: 'Uw verhaal', text: 'U vertelt wat u wilt. Met uw beschrijving en eventueel foto’s krijgen we een eerste beeld van uw project.' },
          { title: 'Een passend plan', text: 'We bespreken de mogelijkheden en bekijken wat nodig is. U krijgt een voorstel met duidelijke afspraken.' },
          { title: 'Zorgvuldig uitgevoerd', text: 'Na uw akkoord stemmen we de planning af. We installeren, stellen af en laten zien hoe het werkt.' },
        ].map((step, index) => <li key={step.title}><div className="v-process-line"><span>0{index + 1}</span><ArrowRight size={19} /></div><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol>
      </section>

      <section className="v-faq v-section"><div className="v-container v-faq-grid"><div><p className="v-eyebrow">EVEN GOED OM TE WETEN</p><h2>Uw vragen.<br />Heldere antwoorden.</h2><Link to={requestUrl} className="v-inline-link">Stel uw eigen vraag <ArrowUpRight size={18} /></Link></div><div className="v-faq-list">{questions.map(item => <details key={item.q}><summary>{item.q}<ChevronDown size={19} /></summary><p>{item.a}</p></details>)}</div></div></section>

      <section className="v-contact"><div className="v-container"><div><p className="v-eyebrow">UW PLANNEN. ONZE VOLGENDE KLUS.</p><h2>Wat mogen we<br />voor u <span>regelen?</span></h2></div><div className="v-contact-action"><p>Een eerste idee of een concreet project?<br />Vertel het ons. We denken graag mee.</p><Link to={requestUrl} className="v-button v-button-dark">Laten we kennismaken <ArrowUpRight size={20} /></Link><span>In een paar stappen uw aanvraag versturen.</span></div></div></section>
    </main>

    <footer className="v-footer"><div className="v-container"><div className="v-footer-main"><div><Brand light /><p>Doordachte techniek.<br />Elke dag comfort.</p></div><nav aria-label="Footer expertise"><span>ONZE EXPERTISE</span>{SERVICES.map(service => <Link key={service.name} to={`${requestUrl}?dienst=${encodeURIComponent(service.name)}`}>{service.name}</Link>)}</nav><nav aria-label="Footer navigatie"><span>ONTDEK VELD</span><a href="#projecten">Voorbeeldproject</a><a href="#over-veld">Over Veld</a><a href="#werkwijze">Onze werkwijze</a><Link to={requestUrl}>Uw project bespreken <ArrowUpRight size={14} /></Link></nav></div><div className="v-footer-bottom"><span>Veld is een fictief installatiebedrijf. Beelden en project zijn illustratief.</span><Link to={`${DEMO_BASE}/dashboard`}>Bekijk het beheerdashboard <ArrowUpRight size={14} /></Link></div></div></footer>
    <div className="v-demo-note">Een productdemo van <Link to="/">Harkas IT</Link><span>·</span>Gebruik fictieve gegevens. Aanvragen blijven in deze browser; e-mails worden gesimuleerd.</div>
  </div>;
}
