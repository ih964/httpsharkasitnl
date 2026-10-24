import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowUpRight, ArrowRight, BellRing, CalendarDays, Check, CheckCircle2, ChevronRight, CircleDot, ClipboardList, Download, ExternalLink, FileText, LayoutDashboard, Mail, MessageSquare, Plus, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDemoLeads, isFollowUpDue, type Lead, type LeadStatus } from "./installation-store";
import { Brand } from "./InstallationDemo";
import "./InstallationDashboard.css";

const statuses: LeadStatus[] = ["Nieuw", "In behandeling", "Offerte verstuurd", "Gewonnen", "Afgesloten"];
const statusKey = (status: string) => ({ Nieuw: "new", "In behandeling": "active", "Offerte verstuurd": "quote", Gewonnen: "won", Afgesloten: "closed" }[status] || "new");
const fmtDate = (value: string) => new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(new Date(value));
const fmtTime = (value: string) => new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const initials = (value: string) => value.split(" ").filter(Boolean).slice(0, 2).map(v => v[0]).join("").toUpperCase();
function StatusBadge({ status }: { status: LeadStatus }) { return <span className={`id-status id-status-${statusKey(status)}`}><span />{status}</span>; }

export default function InstallationDashboard() {
  const { leads, updateLead, addNote, reset, storageError } = useDemoLeads();
  const [view, setView] = useState<"overview" | "leads" | "followup">("overview");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Alle statussen");
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("aanvraag");
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [oldestFirst, setOldestFirst] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const selected = leads.find(lead => lead.id === selectedId);
  const newLeads = leads.filter(lead => lead.status === "Nieuw").length;
  const dueLeads = leads.filter(isFollowUpDue);
  const openQuotes = leads.filter(lead => lead.status === "Offerte verstuurd").length;
  const wonLeads = leads.filter(lead => lead.status === "Gewonnen").length;
  const filtered = useMemo(() => leads.filter(lead => {
    const text = `${lead.name} ${lead.id} ${lead.postcode} ${lead.service}`.toLocaleLowerCase("nl-NL");
    return text.includes(search.toLocaleLowerCase("nl-NL")) && (status === "Alle statussen" || lead.status === status) && (view !== "followup" || isFollowUpDue(lead));
  }).sort((a, b) => (oldestFirst ? 1 : -1) * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())), [leads, search, status, view, oldestFirst]);
  function changeView(next: typeof view) { setView(next); setStatus("Alle statussen"); setSearch(""); }
  function safeAction(action: () => void, message: string) { try { action(); setError(""); setNotice(message); } catch (err) { setError(err instanceof Error ? err.message : "Opslaan is niet gelukt. Probeer het opnieuw."); } }
  function closeLead() { setSearchParams(current => { const next = new URLSearchParams(current); next.delete("aanvraag"); return next; }, { replace: true }); }
  function openLead(lead: Lead) { setSearchParams(current => { const next = new URLSearchParams(current); next.set("aanvraag", lead.id); return next; }, { replace: true }); setNote(""); setError(""); setNotice(""); setEmailOpen(false); }
  function restoreDemo() { if (window.confirm("Alleen de gegevens van deze demo herstellen? Uw toegevoegde demoaanvragen en notities worden verwijderd.")) safeAction(() => { reset(); closeLead(); }, "Voorbeeldgegevens hersteld."); }
  function exportCsv() {
    const safe = (v: string) => `"${(/^[=+\-@\t\r]/.test(v) ? "'" + v : v).replace(/"/g, '""')}"`;
    const rows = [["Referentie", "Naam", "Dienst", "Postcode", "Status", "Ontvangen", "Opvolgen op"], ...filtered.map(lead => [lead.id, lead.name, lead.service, lead.postcode, lead.status, lead.createdAt, lead.followUp || ""])];
    const url = URL.createObjectURL(new Blob(["\ufeff" + rows.map(row => row.map(safe).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url; a.download = "veld-demo-aanvragen.csv"; a.click(); URL.revokeObjectURL(url); setNotice(`${filtered.length} demoaanvragen geëxporteerd.`);
  }
  return <div className="id-dashboard">
    <aside className="id-sidebar">
      <Brand light />
      <div className="id-workspace-label">WERKOMGEVING <span>DEMO</span></div>
      <nav aria-label="Dashboardnavigatie" className="id-nav">
        <button className={view === "overview" ? "is-active" : ""} onClick={() => changeView("overview")}><LayoutDashboard size={18} />Overzicht</button>
        <button className={view === "leads" ? "is-active" : ""} onClick={() => changeView("leads")}><ClipboardList size={18} />Aanvragen<span className="id-nav-count">{leads.length}</span></button>
        <button className={view === "followup" ? "is-active" : ""} onClick={() => changeView("followup")}><BellRing size={18} />Opvolging<span className="id-nav-count">{dueLeads.length}</span></button>
      </nav>
      <div className="id-sidebar-bottom"><div className="id-demo-note"><CircleDot size={17} /><strong>Uw digitale balie</strong><p>Van eerste aanvraag tot een nieuwe opdracht. Alles op één plek.</p></div><Link to="/demo/installatiebedrijf"><ExternalLink size={16} />Bekijk voorbeeldwebsite</Link><button onClick={restoreDemo}><RotateCcw size={16} />Voorbeeldgegevens herstellen</button><div className="id-user"><span>VI</span><div><strong>Veld Installatietechniek</strong><small>Demonstratieaccount</small></div></div></div>
    </aside>
    <div className="id-main">
      <header className="id-topbar"><span>Werkruimte <ChevronRight size={14} /><strong>{view === "overview" ? "Overzicht" : view === "leads" ? "Aanvragen" : "Opvolging"}</strong></span><div className="id-live"><span />Lokale demo</div></header>
      <main className="id-content">
        <div className="id-page-heading"><div><p className="id-eyebrow">UW BEDRIJF IN BEELD</p><h1>{view === "overview" ? "Grip op elke aanvraag." : view === "leads" ? "Alle aanvragen." : "Tijd voor de volgende stap."}</h1><p>{view === "followup" ? "Deze aanvragen hebben vandaag of eerder een opvolgdatum." : "Een helder overzicht. Een persoonlijke aanpak. Geen aanvraag uit het oog."}</p></div><Link className="id-primary" to="/demo/installatiebedrijf/aanvragen"><Plus size={17} />Nieuwe demoaanvraag</Link></div>
        <div className="id-local-banner"><span><CircleDot size={15} />Fictieve gegevens · alleen opgeslagen in deze browser</span><span>Er worden geen e-mails verstuurd.</span></div>
        {storageError && <p role="alert" className="id-error">{storageError}</p>}
        {notice && !selected && <p role="status" className="id-success"><CheckCircle2 size={16} />{notice}</p>}{error && !selected && <p role="alert" className="id-error">{error}</p>}
        <div className="id-kpis">
          <button className="id-kpi" onClick={() => { changeView("leads"); setStatus("Nieuw"); }}><span>Nieuwe aanvragen <ClipboardList size={17} /></span><strong>{newLeads.toString().padStart(2, "0")}</strong><small>Wachten op eerste contact <ArrowUpRight size={15} /></small></button>
          <button className="id-kpi" onClick={() => changeView("followup")}><span>Opvolging nodig <BellRing size={17} /></span><strong>{dueLeads.length.toString().padStart(2, "0")}</strong><small>Vandaag en achterstallig <ArrowUpRight size={15} /></small></button>
          <button className="id-kpi" onClick={() => { changeView("leads"); setStatus("Offerte verstuurd"); }}><span>Openstaande offertes <FileText size={17} /></span><strong>{openQuotes.toString().padStart(2, "0")}</strong><small>Wachten op een reactie <ArrowUpRight size={15} /></small></button>
          <button className="id-kpi id-kpi-won" onClick={() => { changeView("leads"); setStatus("Gewonnen"); }}><span>Gewonnen opdrachten <CheckCircle2 size={17} /></span><strong>{wonLeads.toString().padStart(2, "0")}</strong><small>Van aanvraag naar akkoord <ArrowUpRight size={15} /></small></button>
        </div>
        {view === "overview" && dueLeads.length > 0 && <div className="id-followup-callout"><span className="id-followup-icon"><CalendarDays size={22} /></span><div><strong>{dueLeads.length === 1 ? "Eén aanvraag verdient uw aandacht." : `${dueLeads.length} aanvragen verdienen uw aandacht.`}</strong><p>Een kort contactmoment kan het verschil maken.</p></div><button onClick={() => changeView("followup")}>Bekijk opvolging <ArrowRight size={17} /></button></div>}
        <section className="id-leads-panel" aria-labelledby="id-table-title">
          <div className="id-panel-heading"><div><h2 id="id-table-title">{view === "followup" ? "Op te volgen aanvragen" : "Aanvragen"}<span>{filtered.length}</span></h2><p>Klik op een aanvraag om de details en vervolgstappen te bekijken.</p></div><button className="id-secondary" onClick={exportCsv}><Download size={16} />Exporteren</button></div>
          <div className="id-filters"><label className="id-search"><Search size={17} /><span className="id-sr-only">Zoek aanvragen</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Zoek op naam, referentie of dienst…" /></label><label className="id-filter-select"><SlidersHorizontal size={16} /><span className="id-sr-only">Filter op status</span><select value={status} onChange={e => setStatus(e.target.value)}><option>Alle statussen</option>{statuses.map(s => <option key={s}>{s}</option>)}</select></label><button type="button" className="id-secondary id-mobile-sort" onClick={() => setOldestFirst(!oldestFirst)}>{oldestFirst ? "Oudste eerst" : "Nieuwste eerst"}<ArrowDown size={13} style={{ transform: oldestFirst ? "rotate(180deg)" : undefined }} /></button></div>
          <div className="id-table-wrap"><table role="table" aria-label="Demoaanvragen"><thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col">Klant / referentie</th><th role="columnheader" scope="col">Dienst</th><th role="columnheader" scope="col">Status</th><th role="columnheader" scope="col"><span className="id-mobile-column-name">Ontvangen</span><button className="id-sort" onClick={() => setOldestFirst(!oldestFirst)}>Ontvangen <ArrowDown size={13} style={{ transform: oldestFirst ? "rotate(180deg)" : undefined }} /></button></th><th role="columnheader" scope="col">Opvolgen</th><th role="columnheader" scope="col"><span className="id-sr-only">Openen</span></th></tr></thead><tbody role="rowgroup">{filtered.map(lead => <tr role="row" key={lead.id}><td role="cell"><button className="id-client" onClick={() => openLead(lead)} aria-label={`Open aanvraag van ${lead.name}`}><span className="id-avatar">{initials(lead.name)}</span><span><strong>{lead.name}</strong><small>{lead.id} · {lead.postcode}</small></span></button></td><td role="cell" data-label="Dienst"><span className="id-service">{lead.service}</span></td><td role="cell" data-label="Status"><StatusBadge status={lead.status} /></td><td role="cell" data-label="Ontvangen" className="id-date">{fmtDate(lead.createdAt)}</td><td role="cell" data-label="Opvolgen">{lead.followUp ? <span className={isFollowUpDue(lead) ? "id-due" : "id-date"}>{isFollowUpDue(lead) && <CircleDot size={12} />}{fmtDate(lead.followUp + "T12:00:00")}</span> : <span className="id-muted">—</span>}</td><td role="cell"><button className="id-row-open" onClick={() => openLead(lead)} aria-label={`Bekijk ${lead.id}`}><ChevronRight size={18} /></button></td></tr>)}</tbody></table></div>
          {filtered.length === 0 && <div className="id-empty"><Search size={26} /><h3>Geen aanvragen gevonden</h3><p>{view === "followup" ? "Er staan geen aanvragen open die aan deze opvolgfilters voldoen." : "Pas uw zoekopdracht of statusfilter aan."}</p><button className="id-secondary" onClick={() => { setSearch(""); setStatus("Alle statussen"); }}>Filters wissen</button></div>}
          <div className="id-table-footer"><span>{filtered.length} van {leads.length} aanvragen</span><span><Check size={14} />Wijzigingen worden lokaal bewaard</span></div>
        </section>
        <div className="id-dashboard-footer"><span>VELD <span>·</span> Digitale balie</span><button type="button" className="id-mobile-reset" onClick={restoreDemo}><RotateCcw size={13} />Voorbeeldgegevens herstellen</button><span>Een productdemo van Harkas IT</span></div>
      </main>
    </div>
    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) closeLead(); }}><DialogContent className="installation-demo id-detail">
      {selected && <><DialogHeader><p className="id-eyebrow">AANVRAAG {selected.id}</p><DialogTitle className="id-detail-title">{selected.service}</DialogTitle><DialogDescription className="id-detail-subtitle">Ontvangen op {fmtTime(selected.createdAt)} · Fictieve demoaanvraag</DialogDescription></DialogHeader>
        <div className="id-detail-grid"><div className="id-detail-body"><div className="id-detail-client"><span className="id-avatar">{initials(selected.name)}</span><div><strong>{selected.name}</strong><span>{selected.postcode}</span></div><StatusBadge status={selected.status} /></div><div className="id-contact-grid"><div><small>E-mailadres</small><span>{selected.email}</span></div><div><small>Telefoon</small><span>{selected.phone || "Niet opgegeven"}</span></div></div><div className="id-description"><h3>De aanvraag</h3><p>{selected.description}</p><span><CalendarDays size={15} />Voorkeur: {selected.preference || "Geen voorkeur opgegeven"}</span></div>
        {selected.photos.length > 0 && <div className="id-photos"><h3>Bijgevoegde foto's</h3><div>{selected.photos.map(photo => <figure key={photo.id}><img src={photo.dataUrl} alt={photo.name} /><figcaption>{photo.name}</figcaption></figure>)}</div></div>}
        <form className="id-notes" onSubmit={e => { e.preventDefault(); if (note.trim()) safeAction(() => { addNote(selected.id, note.trim()); setNote(""); }, "Interne notitie opgeslagen."); }}><h3><MessageSquare size={16} />Interne notities</h3><label className="id-sr-only" htmlFor="id-note">Nieuwe interne notitie</label><textarea id="id-note" placeholder="Bijvoorbeeld: klant gebeld, vrijdag een afspraak plannen…" value={note} onChange={e => setNote(e.target.value)} maxLength={2000} rows={3} /><button className="id-primary" disabled={!note.trim()} type="submit"><Plus size={15} />Notitie toevoegen</button>{selected.notes.map(item => <div key={item.id} className="id-note"><p>{item.text}</p><small>Demobeheerder · {fmtTime(item.at)}</small></div>)}</form>
        <div className="id-email"><button aria-expanded={emailOpen} onClick={() => setEmailOpen(!emailOpen)}><Mail size={17} /><span><strong>Ontvangstbevestiging</strong><small>Bekijk het e-mailvoorbeeld · niet verzonden</small></span><ChevronRight size={17} style={{ transform: emailOpen ? "rotate(90deg)" : undefined }} /></button>{emailOpen && <div><small>AAN: {selected.email}</small><h4>Wij hebben uw aanvraag ontvangen · {selected.id}</h4><p>Beste {selected.name},</p><p>Bedankt voor uw aanvraag voor {selected.service.toLowerCase()}. We bekijken uw wensen en nemen contact met u op om de volgende stap te bespreken.</p><p>Met vriendelijke groet,<br />Veld Installatietechniek</p><strong className="id-email-disclaimer">Gesimuleerd voorbeeld. Er is geen e-mail verstuurd.</strong></div>}</div>
        </div><aside className="id-detail-aside"><h3>Vervolgstappen</h3><label>Status<select value={selected.status} onChange={e => safeAction(() => updateLead(selected.id, { status: e.target.value as LeadStatus }), "Status bijgewerkt.")}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label><label>Opvolgen op<input type="date" value={selected.followUp || ""} onChange={e => safeAction(() => updateLead(selected.id, { followUp: e.target.value }), "Opvolgdatum bijgewerkt.")} /></label>{selected.followUp && <button className="id-secondary" onClick={() => safeAction(() => updateLead(selected.id, { followUp: "" }), "Opvolging afgerond.")}><Check size={15} />Opvolging afronden</button>}{notice && <p role="status" className="id-success">{notice}</p>}{error && <p role="alert" className="id-error">{error}</p>}<div className="id-activity"><h3>Activiteit</h3>{[...selected.activity].reverse().map(item => <div key={item.id}><span /><p>{item.text}<small>{fmtTime(item.at)}</small></p></div>)}</div><p className="id-detail-local">Alle wijzigingen blijven in deze browser. Gebruik uitsluitend fictieve gegevens.</p></aside></div>
      </>}
    </DialogContent></Dialog>
  </div>;
}
