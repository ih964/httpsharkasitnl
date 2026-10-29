import { useEffect, useRef, useState } from 'react';
import { portalSupabase as db, supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Upload, FolderPlus, Folder, FileText, Download, Pencil, Trash2, RotateCcw, History, Search, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Version = { id:string; version:number; storage_path:string; mime_type:string; size_bytes:number; created_at:string };
type Doc = { id:string; name:string; folder_id:string|null; customer_id:string|null; deleted_at:string|null; updated_at:string; document_versions:Version[] };
type FolderRow = {id:string;name:string};
type Customer = {id:string;name:string;company_name:string|null};
const bucket = db.storage.from('admin-documents');
const newest = (d:Doc) => [...d.document_versions].sort((a,b)=>b.version-a.version)[0];
const size = (n:number) => n < 1024 ? `${n} B` : n < 1048576 ? `${(n/1024).toFixed(1)} KB` : `${(n/1048576).toFixed(1)} MB`;
const date = (s:string) => new Date(s).toLocaleString('nl-NL');
const editable = (name:string) => /\.(txt|md|csv|json|log|xml|yaml|yml)$/i.test(name);
const err = (e:unknown) => toast.error(e instanceof Error ? e.message : (e as {message?:string})?.message || 'De actie is mislukt.');
function checked<T extends {error?:{message:string}|null}>(r:T):T { if(r.error) throw new Error(r.error.message); return r; }

export default function AdminDocuments() {
 const [docs,setDocs]=useState<Doc[]>([]),[folders,setFolders]=useState<FolderRow[]>([]),[customers,setCustomers]=useState<Customer[]>([]);
 const [folder,setFolder]=useState('all'),[search,setSearch]=useState(''),[customer,setCustomer]=useState('all');
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[progress,setProgress]=useState(''),[loadError,setLoadError]=useState('');
 const [selected,setSelected]=useState<Doc|null>(null),[preview,setPreview]=useState(''),[previewMime,setPreviewMime]=useState(''),[text,setText]=useState<string|null>(null),[dirty,setDirty]=useState(false),[previewLoading,setPreviewLoading]=useState(false);
 const [history,setHistory]=useState<Doc|null>(null),[meta,setMeta]=useState<Doc|null>(null),[name,setName]=useState(''),[metaFolder,setMetaFolder]=useState(''),[metaCustomer,setMetaCustomer]=useState('');
 const [folderDialog,setFolderDialog]=useState(false),[folderName,setFolderName]=useState(''),[replace,setReplace]=useState<Doc|null>(null);
 const input=useRef<HTMLInputElement>(null), previewRequest=useRef(0), objectUrl=useRef('');
 const load=async()=>{
  setLoading(true);setLoadError('');
  try {
   const [d,f,c]=await Promise.all([db.from('documents').select('*,document_versions(*)').order('updated_at',{ascending:false}),db.from('document_folders').select('*').order('name'),supabase.from('customers').select('id,name,company_name').order('name')]);
   checked(d);checked(f);checked(c);setDocs(d.data||[]);setFolders(f.data||[]);setCustomers(c.data||[]);
  }catch(e){setLoadError((e as Error).message);err(e);}finally{setLoading(false);}
 };
 useEffect(()=>{void load();return ()=>{previewRequest.current++;if(objectUrl.current)URL.revokeObjectURL(objectUrl.current);};},[]);
 const action=async(fn:()=>Promise<void>)=>{setBusy(true);try{await fn();await load();}catch(e){err(e);}finally{setBusy(false);setProgress('');}};
 const saveVersion=async(file:File,existing:Doc|null)=>{
  if(file.size>50*1024*1024)throw new Error(`${file.name}: maximaal 50 MB per bestand.`);
  const path=`${crypto.randomUUID()}/${crypto.randomUUID()}`;
  checked(await bucket.upload(path,file,{contentType:file.type||'application/octet-stream',upsert:false}));
  // Register only after a successful immutable upload. A failed registration never replaces a saved version.
  checked(await db.rpc('save_document_version',{p_document_id:existing?.id||null,p_name:file.name,p_folder_id:folder==='all'||folder==='trash'?null:folder,p_customer_id:customer==='all'?null:customer,p_storage_path:path,p_mime_type:file.type||'application/octet-stream',p_size_bytes:file.size,p_expected_version:existing?newest(existing)?.version||0:0}));
 };
 const upload=async(files:FileList|File[],target:Doc|null=replace)=>{
  const list=Array.from(files);if(!list.length||busy)return;
  setReplace(null);
  await action(async()=>{
   let count=0;const failures:string[]=[];
   for(const file of list){setProgress(`Uploaden ${++count}/${list.length}: ${file.name}`);try{await saveVersion(file,target); }catch(e){failures.push(`${file.name}: ${(e as Error).message}`);}}
   if(failures.length)throw new Error(failures.join('\n'));
   toast.success(target?'Nieuwe versie opgeslagen':'Bestanden opgeslagen');
  });
 };
 const closePreview=()=>{
  if(dirty&&!window.confirm('Je hebt wijzigingen die nog niet zijn opgeslagen. Sluiten?'))return;
  previewRequest.current++;if(objectUrl.current)URL.revokeObjectURL(objectUrl.current);objectUrl.current='';setPreview('');setSelected(null);setText(null);setDirty(false);
 };
 const open=async(d:Doc)=>{
  const v=newest(d);if(!v)return;
  const request=++previewRequest.current;setSelected(d);setPreview('');setText(null);setDirty(false);setPreviewLoading(true);
  if(objectUrl.current)URL.revokeObjectURL(objectUrl.current);objectUrl.current='';
  try {
   if(editable(d.name)&&v.size_bytes<=1048576){const {data}=checked(await bucket.download(v.storage_path));const body=await data.text();if(request===previewRequest.current)setText(body);}
   else if(v.mime_type==='application/pdf'||['image/png','image/jpeg','image/gif','image/webp'].includes(v.mime_type)){
    const {data}=checked(await bucket.download(v.storage_path));if(request===previewRequest.current){const url=URL.createObjectURL(data);objectUrl.current=url;setPreviewMime(v.mime_type);setPreview(url);}
   }
  }catch(e){err(e);}finally{if(request===previewRequest.current)setPreviewLoading(false);}
 };
 const download=async(d:Doc,v=newest(d))=>{
  if(!v)return;try{const {data}=checked(await bucket.download(v.storage_path));const url=URL.createObjectURL(data);const a=document.createElement('a');a.href=url;a.download=d.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}catch(e){err(e);}
 };
 const editMeta=(d:Doc)=>{setMeta(d);setName(d.name);setMetaFolder(d.folder_id||'');setMetaCustomer(d.customer_id||'');};
 const visible=docs.filter(d=>(folder==='trash'?!!d.deleted_at:!d.deleted_at)&&(folder==='all'||folder==='trash'||d.folder_id===folder)&&(customer==='all'||d.customer_id===customer)&&d.name.toLowerCase().includes(search.toLowerCase()));
 const active=docs.filter(d=>!d.deleted_at),total=docs.reduce((n,d)=>n+d.document_versions.reduce((a,v)=>a+v.size_bytes,0),0);
 const selectClass='h-10 rounded-md border border-input bg-background px-3 text-sm w-full';
 return <div className="space-y-6">
  <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold tracking-tight">Documenten</h1><p className="text-muted-foreground mt-1">Alle bestanden van Harkas IT op één plek.</p></div><div className="flex gap-2"><Button variant="outline" disabled={busy} onClick={()=>setFolderDialog(true)}><FolderPlus className="mr-2 h-4 w-4"/>Nieuwe map</Button><Button disabled={busy||folder==='trash'} onClick={()=>{setReplace(null);input.current?.click();}}><Upload className="mr-2 h-4 w-4"/>Uploaden</Button></div></div>
  <input ref={input} type="file" multiple={!replace} className="hidden" aria-label="Bestanden uploaden" onChange={e=>{if(e.target.files)void upload(e.target.files);e.target.value='';}}/>
  <div className="grid sm:grid-cols-3 gap-3"><div className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Documenten</p><p className="text-2xl font-semibold mt-1">{active.length}</p></div><div className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Opslag inclusief versies</p><p className="text-2xl font-semibold mt-1">{size(total)}</p></div><div className="rounded-xl border bg-card p-4 flex gap-3 items-center"><ShieldCheck className="text-primary h-7 w-7"/><div><p className="font-medium">Privéopslag</p><p className="text-sm text-muted-foreground">Alleen beheerders hebben toegang</p></div></div></div>
  <div className="grid md:grid-cols-[210px_minmax(0,1fr)] gap-5">
   <aside className="rounded-xl border bg-card p-3 space-y-1 self-start"><Button className="w-full justify-start" variant={folder==='all'?'secondary':'ghost'} onClick={()=>setFolder('all')}><FileText className="mr-2 h-4 w-4"/>Alle documenten</Button><p className="text-xs font-semibold text-muted-foreground px-3 pt-4 pb-2 uppercase">Mappen</p>{folders.map(f=><Button key={f.id} title={f.name} className="w-full justify-start overflow-hidden" variant={folder===f.id?'secondary':'ghost'} onClick={()=>setFolder(f.id)}><Folder className="mr-2 h-4 w-4 shrink-0"/><span className="truncate">{f.name}</span></Button>)}<div className="border-t mt-3 pt-3"><Button className="w-full justify-start" variant={folder==='trash'?'secondary':'ghost'} onClick={()=>setFolder('trash')}><Trash2 className="mr-2 h-4 w-4"/>Prullenbak ({docs.filter(d=>d.deleted_at).length})</Button></div></aside>
   <section className="rounded-xl border bg-card min-w-0" onDragOver={e=>{e.preventDefault();}} onDrop={e=>{e.preventDefault();if(folder!=='trash'&&!busy){setReplace(null);void upload(e.dataTransfer.files,null);}}}>
    <div className="border-b p-4 flex flex-wrap gap-3"><div className="relative flex-1 min-w-48"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input className="pl-9" placeholder="Zoeken op bestandsnaam…" value={search} onChange={e=>setSearch(e.target.value)} aria-label="Zoeken op bestandsnaam"/></div><select aria-label="Filter op klant" className={selectClass+' sm:w-56'} value={customer} onChange={e=>setCustomer(e.target.value)}><option value="all">Alle klanten</option>{customers.map(c=><option key={c.id} value={c.id}>{c.company_name||c.name}</option>)}</select></div>
    {progress&&<p role="status" className="px-4 py-3 text-sm flex gap-2 items-center"><Loader2 className="h-4 w-4 animate-spin"/>{progress}</p>}
    {loadError?<div role="alert" className="p-8 text-center"><p>{loadError}</p><Button variant="outline" onClick={()=>void load()}>Opnieuw proberen</Button></div>:loading?<p role="status" className="p-12 text-center text-muted-foreground">Documenten laden…</p>:!visible.length?<div className="p-12 text-center"><Folder className="mx-auto mb-4 h-10 w-10 text-muted-foreground"/><h2 className="font-semibold">{folder==='trash'?'De prullenbak is leeg':'Geen documenten gevonden'}</h2><p className="text-sm text-muted-foreground mt-2">{folder==='trash'?'Verwijderde documenten kun je hier terugzetten.':'Upload bestanden of sleep ze naar dit vlak. Maximaal 50 MB per bestand.'}</p></div>:<div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/30 text-muted-foreground"><tr><th className="text-left p-4">Naam</th><th className="text-left p-4 hidden lg:table-cell">Klant / map</th><th className="text-left p-4">Gewijzigd</th><th className="p-4 text-right">Acties</th></tr></thead><tbody>{visible.map(d=>{const v=newest(d);return <tr key={d.id} className="border-t hover:bg-muted/20"><td className="p-4"><button className="flex items-center gap-3 text-left hover:text-primary disabled:opacity-60" disabled={busy||!!d.deleted_at} onClick={()=>void open(d)}><FileText className="h-5 w-5 shrink-0 text-primary"/><span className="break-all"><span className="font-medium">{d.name}</span><span className="block text-xs text-muted-foreground mt-1">{v?`${size(v.size_bytes)} · versie ${v.version}`:'Geen versie'}</span></span></button></td><td className="p-4 text-muted-foreground hidden lg:table-cell">{customers.find(c=>c.id===d.customer_id)?.company_name||customers.find(c=>c.id===d.customer_id)?.name||'Algemeen'}<span className="block text-xs mt-1">{folders.find(f=>f.id===d.folder_id)?.name||'Geen map'}</span></td><td className="p-4 whitespace-nowrap text-muted-foreground">{date(d.updated_at)}</td><td className="p-3"><div className="flex justify-end gap-1">{d.deleted_at?<Button size="icon" variant="ghost" title="Terugzetten" aria-label={`Terugzetten ${d.name}`} disabled={busy} onClick={()=>void action(async()=>{checked(await db.from('documents').update({deleted_at:null}).eq('id',d.id));toast.success('Document teruggezet');})}><RotateCcw className="h-4 w-4"/></Button>:<><Button size="icon" variant="ghost" title="Downloaden" aria-label={`Downloaden ${d.name}`} disabled={busy} onClick={()=>void download(d)}><Download className="h-4 w-4"/></Button><Button size="icon" variant="ghost" title="Naam, map en klant aanpassen" aria-label={`Eigenschappen ${d.name}`} disabled={busy} onClick={()=>editMeta(d)}><Pencil className="h-4 w-4"/></Button><Button size="icon" variant="ghost" title="Versies" aria-label={`Versies ${d.name}`} onClick={()=>setHistory(d)}><History className="h-4 w-4"/></Button><Button size="icon" variant="ghost" title="Naar prullenbak" aria-label={`Verwijderen ${d.name}`} disabled={busy} onClick={()=>void action(async()=>{checked(await db.from('documents').update({deleted_at:new Date().toISOString()}).eq('id',d.id));toast.success('Document verplaatst naar prullenbak');})}><Trash2 className="h-4 w-4"/></Button></>}</div></td></tr>;})}</tbody></table></div>}
    <p className="border-t p-4 text-xs text-muted-foreground">Elke nieuwe versie blijft bewaard. Word en Excel: downloaden, aanpassen en als nieuwe versie uploaden.</p>
   </section>
  </div>
  <Dialog open={folderDialog} onOpenChange={setFolderDialog}><DialogContent><DialogHeader><DialogTitle>Nieuwe map</DialogTitle><DialogDescription>Maak een map om documenten te ordenen.</DialogDescription></DialogHeader><Label htmlFor="folder-name">Mapnaam</Label><Input id="folder-name" maxLength={160} value={folderName} onChange={e=>setFolderName(e.target.value)}/><Button disabled={busy||!folderName.trim()} onClick={()=>void action(async()=>{checked(await db.from('document_folders').insert({name:folderName.trim()}));setFolderDialog(false);setFolderName('');toast.success('Map aangemaakt');})}>Map aanmaken</Button></DialogContent></Dialog>
  <Dialog open={!!meta} onOpenChange={v=>{if(!v)setMeta(null);}}><DialogContent><DialogHeader><DialogTitle>Document aanpassen</DialogTitle><DialogDescription>Wijzig de naam, map of klantkoppeling.</DialogDescription></DialogHeader><Label htmlFor="doc-name">Bestandsnaam</Label><Input id="doc-name" maxLength={240} value={name} onChange={e=>setName(e.target.value)}/><Label htmlFor="doc-folder">Map</Label><select id="doc-folder" className={selectClass} value={metaFolder} onChange={e=>setMetaFolder(e.target.value)}><option value="">Geen map</option>{folders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select><Label htmlFor="doc-customer">Klant</Label><select id="doc-customer" className={selectClass} value={metaCustomer} onChange={e=>setMetaCustomer(e.target.value)}><option value="">Algemeen</option>{customers.map(c=><option key={c.id} value={c.id}>{c.company_name||c.name}</option>)}</select><Button disabled={busy||!name.trim()} onClick={()=>void action(async()=>{checked(await db.from('documents').update({name:name.trim(),folder_id:metaFolder||null,customer_id:metaCustomer||null,updated_at:new Date().toISOString()}).eq('id',meta!.id));setMeta(null);toast.success('Document bijgewerkt');})}>Opslaan</Button></DialogContent></Dialog>
  <Dialog open={!!selected} onOpenChange={v=>{if(!v&&!busy)closePreview();}}><DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle className="pr-6 break-all">{selected?.name}</DialogTitle><DialogDescription>Bekijk het document of bewaar een nieuwe versie.</DialogDescription></DialogHeader><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={()=>selected&&void download(selected)}><Download className="mr-2 h-4 w-4"/>Downloaden</Button><Button variant="outline" disabled={busy||dirty} onClick={()=>{setReplace(selected);input.current?.click();}}>Nieuwe versie uploaden</Button>{text!==null&&<Button disabled={busy||!dirty} onClick={()=>void action(async()=>{await saveVersion(new File([text],selected!.name,{type:newest(selected!).mime_type}),selected);setDirty(false);previewRequest.current++;setSelected(null);toast.success('Nieuwe versie opgeslagen');})}>Wijzigingen opslaan</Button>}</div>{previewLoading?<p role="status" className="p-10 text-center">Voorbeeld laden…</p>:text!==null?<textarea aria-label="Documentinhoud" className="w-full min-h-[50vh] rounded-md border bg-background p-4 font-mono text-sm" value={text} onChange={e=>{setText(e.target.value);setDirty(true);}}/>:preview?previewMime==='application/pdf'?<iframe title="Documentvoorbeeld" src={preview} className="w-full h-[60vh] rounded border"/>:<img src={preview} alt={selected?.name} className="max-h-[60vh] mx-auto object-contain"/>:<div className="p-10 text-center bg-muted/30 rounded-lg"><FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3"/><p>Download dit bestand om het te openen en aan te passen.</p><p className="text-sm text-muted-foreground mt-2">Upload je aangepaste bestand daarna als nieuwe versie.</p></div>}</DialogContent></Dialog>
  <Dialog open={!!history} onOpenChange={v=>{if(!v)setHistory(null);}}><DialogContent><DialogHeader><DialogTitle>Versiegeschiedenis</DialogTitle><DialogDescription className="break-all">{history?.name}</DialogDescription></DialogHeader><div className="max-h-[55vh] overflow-y-auto space-y-2">{history&&[...history.document_versions].sort((a,b)=>b.version-a.version).map(v=><div key={v.id} className="flex items-center justify-between border rounded-lg p-3"><div><p className="font-medium">Versie {v.version}{v.id===newest(history)?.id?' · huidig':''}</p><p className="text-xs text-muted-foreground">{date(v.created_at)} · {size(v.size_bytes)}</p></div><Button variant="outline" size="sm" onClick={()=>void download(history,v)}>Downloaden</Button></div>)}</div></DialogContent></Dialog>
 </div>;
}
