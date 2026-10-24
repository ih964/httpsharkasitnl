import { FormEvent, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, CheckCircle2, ImagePlus, LockKeyhole, Mail, Trash2, Wrench, Zap, Wind, ThermometerSun } from 'lucide-react';
import { Brand, DEMO_BASE, SERVICES } from './InstallationDemo';
import { useDemoLeads, type Lead } from './installation-store';

const icons = [ThermometerSun, Zap, Wind, Wrench];
const blank = { name: '', email: '', phone: '', postcode: '', description: '', preference: 'Geen voorkeur' };
async function readPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url; await image.decode();
    const scale = Math.min(1, 1000 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.width*scale)); canvas.height = Math.max(1, Math.round(image.height*scale));
    const context = canvas.getContext('2d'); if (!context) throw new Error('Deze browser kan de foto niet verwerken.');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', .68);
  } finally { URL.revokeObjectURL(url); }
}

export default function InstallationRequest() {
  const [params] = useSearchParams();
  const [service, setService] = useState(SERVICES.find(s=>s.name===params.get('dienst'))?.name || '');
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(blank);
  const [photos, setPhotos] = useState<Lead['photos']>([]);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<Lead | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { addLead, storageError } = useDemoLeads();
  const field = (key: keyof typeof blank) => ({ value: form[key], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({...form,[key]:e.target.value}) });
  function move(to: number) { setStep(to); setError(''); setTimeout(()=>headingRef.current?.focus(),0); }
  function example() { setService(current => current || SERVICES[0].name); setForm({ name: 'Robin Voorbeeld', email: 'robin@voorbeeld.example', phone: '0600000000', postcode: '1234 AB', description: 'Dit is een fictieve demoaanvraag. Ik wil mijn woning verbeteren en bespreek graag de mogelijkheden voor de gekozen werkzaamheden. Foto’s en extra informatie kan ik tijdens de intake toelichten.', preference: 'In de ochtend' }); setError(''); }
  function submit(e: FormEvent) {
    e.preventDefault(); setError('');
    if (!service) { setError('Kies eerst het type werkzaamheden.'); return; }
    if (!formRef.current?.reportValidity()) return;
    if (step===1 && form.description.trim().length<12) { setError('Beschrijf uw project in minimaal 12 tekens.'); return; }
    if (step<2) { move(step+1); return; }
    if (form.name.trim().length<2) { setError('Vul een naam van minimaal 2 tekens in.'); return; }
    try { const lead = addLead({ ...form, name:form.name.trim(), service, photos }); setResult(lead); window.scrollTo(0,0); } catch(err) { setError(err instanceof Error ? err.message : 'Opslaan lukt niet. Probeer het opnieuw.'); }
  }
  async function filesChanged(files: FileList | null) {
    if(!files?.length) return;
    setError('');
    if (photos.length+files.length>3) { setError('Voeg maximaal 3 foto’s toe.'); return; }
    const list = Array.from(files);
    if(list.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>8*1024*1024)) { setError('Kies een JPG-, PNG- of WebP-foto van maximaal 8 MB.'); return; }
    setProcessing(true);
    try { const next = [...photos,...await Promise.all(list.map(async file=>({ id:crypto.randomUUID(), name:file.name, dataUrl:await readPhoto(file) })))]; if(next.reduce((n,p)=>n+p.dataUrl.length,0)>750*1024) throw new Error('De foto’s zijn samen te groot. Kies minder of kleinere foto’s.'); setPhotos(next); }
    catch(err) { setError(err instanceof Error ? err.message : 'Deze foto kan niet worden gelezen.'); }
    finally { setProcessing(false); }
  }
  return <>
    <header className="id-site-header id-container"><Brand/><Link to={DEMO_BASE} className="id-text-link"><ArrowLeft size={16}/> Terug naar website</Link></header>
    <main className="id-intake-page id-container">
      <aside className="id-intake-aside"><p className="id-eyebrow">UW PROJECT BEGINT HIER</p><h1>Vertel ons<br/>wat u <em>nodig heeft.</em></h1><p>Van een eerste idee tot een concrete klus. Met een paar gegevens kunnen we gericht met u meedenken.</p><ol className="id-intake-steps">{['Uw werkzaamheden','Uw project','Uw gegevens'].map((label,i)=><li className={step===i?'current':step>i||result?'complete':''} key={label}><span>{step>i||result?<Check size={15}/>:i+1}</span><div><small>STAP {i+1}</small><strong>{label}</strong></div></li>)}</ol><div className="id-demo-info"><LockKeyhole size={19}/><div><strong>U probeert een demo</strong><p>Gebruik fictieve gegevens. Uw aanvraag en foto’s blijven in deze browser en worden niet naar een bedrijf of mailbox verstuurd.</p></div></div></aside>
      {result ? <section className="id-intake-card id-success" aria-live="polite"><CheckCircle2 size={46}/><p className="id-eyebrow">AANVRAAG OPGESLAGEN</p><h2>Zo eenvoudig kan het zijn.</h2><p>Uw demoaanvraag staat nu in het beheerdashboard.</p><div className="id-confirm-ref"><span>Uw referentie</span><strong>{result.id}</strong></div><div className="id-email-preview"><h3><Mail size={17}/> Voorbeeld ontvangstbevestiging</h3><small>Simulatie · geen e-mail verstuurd</small><p>Beste {result.name},</p><p>Bedankt voor uw aanvraag voor {result.service.toLowerCase()}. We hebben uw beschrijving ontvangen. De volgende stap is om samen de mogelijkheden te bespreken.</p><p>Met vriendelijke groet,<br/>Veld Installatietechniek — fictief demobedrijf</p></div><Link to={`${DEMO_BASE}/dashboard?aanvraag=${encodeURIComponent(result.id)}`} className="id-btn">Bekijk in beheerdashboard <ArrowUpRight size={17}/></Link><button type="button" className="id-text-link" onClick={()=>{setResult(null);setForm(blank);setPhotos([]);setService('');move(0);}}>Nog een demoaanvraag maken</button></section> : <form ref={formRef} className="id-intake-card" onSubmit={submit}>
        <div className="id-form-top"><span>STAP {step+1} VAN 3</span><button className="id-example" type="button" onClick={example}>Vul voorbeeldgegevens in <ArrowUpRight size={14}/></button></div>
        <h2 ref={headingRef} tabIndex={-1}>{['Waar kunnen we bij helpen?','Vertel iets over uw project.','Hoe kunnen we u bereiken?'][step]}</h2><p className="id-form-intro">{['Kies de dienst die het beste bij uw vraag past.','Een korte beschrijving helpt ons op weg. Foto’s zijn welkom.','Dit is een demo. Gebruik de voorbeeldknop voor fictieve gegevens.'][step]}</p>
        {step===0 && <fieldset className="id-service-options"><legend className="id-sr-only">Type werkzaamheden</legend>{SERVICES.map((s,i)=>{const Icon=icons[i]; return <label key={s.name} className={service===s.name?'selected':''}><input type="radio" name="service" value={s.name} checked={service===s.name} onChange={()=>setService(s.name)} required/><Icon size={24}/><span><strong>{s.name}</strong><small>{s.text}</small></span><span className="id-radio">{service===s.name&&<Check size={12}/>}</span></label>})}</fieldset>}
        {step===1 && <div className="id-form-fields"><label className="id-field">Omschrijving van uw project *<textarea {...field('description')} required minLength={12} maxLength={2000} rows={5} placeholder="Bijvoorbeeld: ik wil mijn cv-ketel vervangen door een warmtepomp…"/></label><label className="id-upload"><ImagePlus size={24}/><strong>{processing?'Foto’s verwerken…':'Foto’s toevoegen'}</strong><span>Max. 3 foto’s · JPG, PNG of WebP · max. 8 MB per foto</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={processing} onChange={e=>{void filesChanged(e.target.files); e.target.value='';}}/></label>{photos.length>0&&<div className="id-photo-grid">{photos.map(p=><div key={p.id}><img src={p.dataUrl} alt={p.name}/><span>{p.name}</span><button type="button" aria-label={`Verwijder ${p.name}`} onClick={()=>setPhotos(photos.filter(x=>x.id!==p.id))}><Trash2 size={15}/></button></div>)}</div>}<label className="id-field">Voorkeur contactmoment<select {...field('preference')}><option>Geen voorkeur</option><option>In de ochtend</option><option>In de middag</option><option>In de avond</option></select></label></div>}
        {step===2 && <div className="id-form-fields"><label className="id-field">Uw naam *<input {...field('name')} required minLength={2} maxLength={80} autoComplete="off" placeholder="Robin Voorbeeld"/></label><label className="id-field">E-mailadres *<input {...field('email')} required type="email" maxLength={160} autoComplete="off" placeholder="robin@voorbeeld.example"/></label><div className="id-fields-row"><label className="id-field">Telefoonnummer *<input {...field('phone')} required type="tel" minLength={8} maxLength={20} autoComplete="off" placeholder="0600000000"/></label><label className="id-field">Postcode *<input {...field('postcode')} required pattern="[1-9][0-9]{3} ?[a-zA-Z]{2}" title="Nederlandse postcode, bijvoorbeeld 1234 AB" maxLength={7} autoComplete="off" placeholder="1234 AB"/></label></div><div className="id-request-summary"><small>UW AANVRAAG</small><strong>{service}</strong><p>{form.description}</p>{photos.length>0&&<span>{photos.length} foto(’s) toegevoegd</span>}</div><p className="id-privacy-copy">Door deze demoaanvraag op te slaan, bewaart u de gegevens lokaal in uw browser. U kunt ze herstellen via het beheerdashboard.</p></div>}
        {(error || storageError)&&<p className="id-form-error" role="alert">{error || storageError}</p>}
        <div className="id-form-actions">{step>0?<button className="id-text-link" type="button" onClick={()=>move(step-1)}><ArrowLeft size={16}/> Vorige</button>:<span className="id-form-time">Duurt ongeveer 2 minuten</span>}<button type="submit" className="id-btn" disabled={processing}>{step===2?'Demoaanvraag opslaan':'Volgende stap'}<ArrowRight size={17}/></button></div>
      </form>}
    </main>
    <div className="id-bottom-note">Fictief demobedrijf · Geen echte offerte of afspraak · Ontwikkeld door Harkas IT</div>
  </>;
}
