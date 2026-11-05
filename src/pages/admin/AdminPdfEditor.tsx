import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, Copy, Download, FilePlus2, FileText, FolderOpen, Highlighter, ImagePlus, Loader2, Maximize2, MousePointer2, PenLine, Plus, Redo2, RotateCw, Save, ScanText, ShieldCheck, Square, Trash2, Type, Undo2, Upload, X, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { PdfPageView, PdfThumbnail, type PdfTool } from '@/components/pdf/PdfPageView';
import { blankPdf, readPdf, type PdfSource } from '@/lib/pdf/renderer';
import { exportPdf } from '@/lib/pdf/export';
import { MAX_PAGES, movePage, normalizeRotation, pdfFilename, uid, type EditorPage, type Mark, type Point } from '@/lib/pdf/model';
import { downloadStoredPdf, folderPath, getPdfDocument, latestVersion, listPdfDocuments, listPdfFolders, saveStoredPdf, type PdfFolder, type StoredPdf } from '@/lib/pdf/storage';
import { PDFDocument } from 'pdf-lib';
import { PdfTextEditorDialog } from '@/components/pdf/PdfTextEditorDialog';
import { inspectPdfText, disposeTextEngine } from '@/lib/pdf/text-client';
import type { PdfTextRun, TextInspection } from '@/lib/pdf/text-engine';
import { recognizePage, type OcrLine } from '@/lib/pdf/ocr';
import './pdf-editor.css';

const tools: { key: PdfTool; label: string; icon: typeof Type; help: string }[] = [
  { key: 'select', label: 'Selecteren', icon: MousePointer2, help: 'Klik op een toevoeging om die te selecteren. Sleep om te verplaatsen.' },
  { key: 'existing', label: 'Tekst bewerken', icon: ScanText, help: 'Klik op een omlijnde tekstregel om de bestaande tekst aan te passen.' },
  { key: 'text', label: 'Tekst toevoegen', icon: Type, help: 'Klik op de pagina waar je tekst wilt toevoegen.' },
  { key: 'highlight', label: 'Markeren', icon: Highlighter, help: 'Sleep over de pagina om een gebied te markeren.' },
  { key: 'draw', label: 'Tekenen', icon: PenLine, help: 'Teken op de pagina, bijvoorbeeld je handtekening.' },
  { key: 'rectangle', label: 'Kader', icon: Square, help: 'Sleep op de pagina om een kader te tekenen.' },
  { key: 'image', label: 'Afbeelding', icon: ImagePlus, help: 'Kies een PNG of JPG. Klik daarna op de pagina om die te plaatsen.' },
];
const fail = (error: unknown) => toast.error(error instanceof Error ? error.message : 'De actie is mislukt. Probeer opnieuw.');
const confirmDiscard = () => window.confirm('Je hebt wijzigingen die nog niet zijn gedownload of opgeslagen. Wil je die verlaten?');

export default function AdminPdfEditor() {
  const [params, setParams] = useSearchParams();
  const [sources, setSources] = useState<Map<string, PdfSource>>(new Map());
  const sourcesRef = useRef(sources);
  const [history, setHistory] = useState<EditorPage[][]>([[]]), [cursor, setCursor] = useState(0);
  const pages = history[cursor];
  const [savedPages, setSavedPages] = useState<EditorPage[]>(pages);
  const [name, setName] = useState('Document.pdf'), [savedName, setSavedName] = useState('Document.pdf');
  const [activeId, setActiveId] = useState(''), [selected, setSelected] = useState<string | null>(null);
  const active = pages.find(p => p.id === activeId) || pages[0];
  const activeIndex = active ? pages.indexOf(active) : 0;
  const selectedMark = active?.marks.find(m => m.id === selected);
  const [stored, setStored] = useState<StoredPdf | null>(null);
  const [tool, setTool] = useState<PdfTool>('select'), [ink, setInk] = useState('#172554'), [size, setSize] = useState(16);
  const [zoom, setZoom] = useState<number | 'fit'>('fit'), [workspaceWidth, setWorkspaceWidth] = useState(700);
  const [busy, setBusy] = useState(''), lock = useRef(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [downloadReady, setDownloadReady] = useState<{ url: string; filename: string } | null>(null);
  const downloadRef = useRef<string | null>(null);
  const [dragging, setDragging] = useState(false), [imageData, setImageData] = useState<{ data: string; width: number; height: number } | null>(null);
  const [textEdit, setTextEdit] = useState<{ point: Point; mark?: Mark } | null>(null), [text, setText] = useState('');
  const [picker, setPicker] = useState(false), [documents, setDocuments] = useState<StoredPdf[]>([]), [query, setQuery] = useState(''), [pickerError, setPickerError] = useState('');
  const [saveDialog, setSaveDialog] = useState(false), [saveMode, setSaveMode] = useState<'version' | 'copy'>('copy'), [saveName, setSaveName] = useState(''), [folder, setFolder] = useState(''), [folders, setFolders] = useState<PdfFolder[]>([]);
  const [folderError, setFolderError] = useState('');
  const [textInspection, setTextInspection] = useState<TextInspection>({ runs: [], skipped: 0 });
  const [detecting, setDetecting] = useState(false), [detectionError, setDetectionError] = useState('');
  const [existingRun, setExistingRun] = useState<PdfTextRun | null>(null);
  const [ocrLines, setOcrLines] = useState<OcrLine[]>([]);
  const ocrCache = useRef(new Map<string, OcrLine[]>()), ocrAbort = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null), appendInput = useRef<HTMLInputElement>(null), imageInput = useRef<HTMLInputElement>(null), workspace = useRef<HTMLDivElement>(null);
  const mounted = useRef(true), lastParam = useRef<string | null>(null), font = useRef<Uint8Array | null>(null);
  const dirty = !!pages.length && (pages !== savedPages || name !== savedName);
  const dirtyRef = useRef(dirty); dirtyRef.current = dirty;
  const scale = active ? zoom === 'fit' ? Math.max(0.15, Math.min(1.4, (workspaceWidth - 64) / (active.rotation % 180 ? active.height : active.width))) : zoom : 1;

  const commit = useCallback((next: EditorPage[]) => {
    if (next === pages) return;
    const updated = [...history.slice(0, cursor + 1), next].slice(-51);
    const retainedBytes = () => [...new Set(updated.flatMap(snapshot => snapshot.map(p => p.sourceId)))].reduce((sum, id) => sum + (sourcesRef.current.get(id)?.bytes.length || 0), 0);
    // Bound undo memory for large scanned pages; retain the newest snapshot at minimum.
    while (updated.length > 1 && retainedBytes() > 150 * 1024 * 1024) updated.shift();
    setHistory(updated); setCursor(updated.length - 1);
  }, [pages, history, cursor]);
  const updateMarks = (marks: Mark[]) => commit(pages.map(p => p.id === active.id ? { ...p, marks } : p));
  const removeMark = () => { if (active && selected) { updateMarks(active.marks.filter(m => m.id !== selected)); setSelected(null); } };
  const choosePage = (id: string) => { setActiveId(id); setSelected(null); setExistingRun(null); };
  const undo = () => { setCursor(c => Math.max(0, c - 1)); setSelected(null); };
  const redo = () => { setCursor(c => Math.min(history.length - 1, c + 1)); setSelected(null); };
  const run = async (label: string, fn: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(label); setErrorMessage('');
    try { await fn(); } catch (e) { setErrorMessage(e instanceof Error ? e.message : 'De actie is mislukt. Probeer opnieuw.'); fail(e); }
    finally { lock.current = false; if (mounted.current) setBusy(''); }
  };

  useEffect(() => {
    mounted.current = true;
    const unload = (event: BeforeUnloadEvent) => { if (dirtyRef.current || lock.current) { event.preventDefault(); event.returnValue = ''; } };
    const navigation = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest?.('a[href]');
      if (dirtyRef.current && anchor && !(anchor as HTMLAnchorElement).download && (anchor as HTMLAnchorElement).target !== '_blank' && (anchor as HTMLAnchorElement).href !== window.location.href && !confirmDiscard()) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener('beforeunload', unload); document.addEventListener('click', navigation, true);
    return () => { mounted.current = false; ocrAbort.current?.abort(); disposeTextEngine(); if (downloadRef.current) URL.revokeObjectURL(downloadRef.current); window.removeEventListener('beforeunload', unload); document.removeEventListener('click', navigation, true); for (const source of sourcesRef.current.values()) void source.pdf.destroy(); };
  }, []);
  useEffect(() => {
    if (!workspace.current) return;
    const observer = new ResizeObserver(entries => setWorkspaceWidth(entries[0].contentRect.width));
    observer.observe(workspace.current); return () => observer.disconnect();
  }, [pages.length > 0]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (busy || textEdit || existingRun || picker || saveDialog || (event.target as Element).closest('input,textarea,select,[contenteditable="true"]')) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); }
      if (event.key === 'Delete' || event.key === 'Backspace') { if (selected) { event.preventDefault(); removeMark(); } }
      if (event.key === 'Escape') { setSelected(null); setTool('select'); }
    };
    window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown);
  });

  useEffect(() => {
    const referenced = new Set(history.flatMap(snapshot => snapshot.map(p => p.sourceId)));
    const unused = [...sourcesRef.current.values()].filter(source => !referenced.has(source.id));
    if (!unused.length) return;
    const next = new Map(sourcesRef.current);
    unused.forEach(source => { next.delete(source.id); void source.pdf.destroy(); });
    sourcesRef.current = next; setSources(next);
  }, [history]);
  useEffect(() => {
    setExistingRun(null); setTextInspection({ runs: [], skipped: 0 }); setDetectionError('');
    setOcrLines(active ? ocrCache.current.get(`${active.sourceId}-${active.index}`) || [] : []);
    if (!active || tool !== 'existing') { setDetecting(false); return; }
    let canceled = false;
    setDetecting(true);
    void inspectPdfText(sourcesRef.current.get(active.sourceId)!.bytes, active.index)
      .then(result => { if (!canceled) setTextInspection(result); })
      .catch(error => { if (!canceled) setDetectionError(error.message); })
      .finally(() => { if (!canceled) setDetecting(false); });
    return () => { canceled = true; };
  }, [active?.sourceId, active?.index, tool]);
  const replaceBasePage = async (bytes: Uint8Array) => {
    const changed = await PDFDocument.load(bytes);
    const form = changed.getForm(); if (form.getFields().length) form.flatten({ updateFieldAppearances: false });
    const single = await PDFDocument.create();
    const [copy] = await single.copyPages(changed, [active.index]); single.addPage(copy);
    const loaded = await readPdf(new File([new Uint8Array(await single.save())], 'Bewerkte pagina.pdf', { type: 'application/pdf' }));
    if (!mounted.current) { await loaded.source.pdf.destroy(); return; }
    const next = new Map(sourcesRef.current); next.set(loaded.source.id, loaded.source);
    sourcesRef.current = next; setSources(next);
    commit(pages.map(page => page.id === active.id ? { ...loaded.pages[0], id: page.id, rotation: page.rotation, marks: page.marks } : page));
    toast.success('Bestaande tekst aangepast');
  };
  const scanPage = () => void run('Scan herkennen…', async () => {
    const controller = new AbortController(); ocrAbort.current = controller;
    try {
      const lines = await recognizePage(sourcesRef.current.get(active.sourceId)!, active, controller.signal, value => { if (mounted.current) setBusy(`Scan herkennen… ${value}%`); });
      if (!mounted.current) return;
      ocrCache.current.set(`${active.sourceId}-${active.index}`, lines); setOcrLines(lines);
      toast.info(lines.length ? `${lines.length} tekstregels herkend. Controleer de tekst voor je deze toepast.` : 'Geen leesbare tekst herkend. Probeer een scherpere scan.');
    } catch (error) { if (!controller.signal.aborted) throw error; }
    finally { ocrAbort.current = null; }
  });
  const editOcrLine = (line: OcrLine) => {
    const mark: Mark = { id: uid(), kind: 'text', x: line.x, y: line.textY, width: line.width, height: line.height,
      text: line.text, size: line.size, color: '#000000', ocrLineId: line.id, ocrConfidence: line.confidence,
      cover: { x: Math.max(0, line.x - 1), y: Math.max(0, line.y - 1), width: Math.min(active.width - Math.max(0,line.x-1), line.width + 2), height: Math.min(active.height - Math.max(0,line.y-1), line.height + 2), color: '#ffffff' } };
    editText({ x: mark.x, y: mark.y }, mark);
  };

  useEffect(() => {
    if (downloadRef.current) URL.revokeObjectURL(downloadRef.current);
    downloadRef.current = null; setDownloadReady(null);
  }, [pages, name]);

  const install = async (files: File[], append: boolean, document: StoredPdf | null = null) => {
    const loaded: Awaited<ReturnType<typeof readPdf>>[] = [];
    try {
      let count = append ? pages.length : 0;
      let total = append ? [...sourcesRef.current.values()].reduce((n, s) => n + s.bytes.length, 0) : 0;
      for (const file of files) {
        total += file.size;
        if (total > 100 * 1024 * 1024) throw new Error('Maximaal 100 MB aan bronbestanden per werkdocument.');
        const item = await readPdf(file); loaded.push(item); count += item.pages.length;
        if (count > MAX_PAGES) throw new Error(`Maximaal ${MAX_PAGES} pagina’s per werkdocument.`);
      }
      if (!mounted.current) { loaded.forEach(item => void item.source.pdf.destroy()); return; }
      const nextSources = append ? new Map(sourcesRef.current) : new Map<string, PdfSource>();
      loaded.forEach(item => nextSources.set(item.source.id, item.source));
      const added = loaded.flatMap(item => item.pages);
      if (append) commit([...pages, ...added]);
      else {
        // Old render tasks are canceled by their component cleanup before destruction.
        const oldSources = sourcesRef.current;
        window.setTimeout(() => { for (const source of oldSources.values()) void source.pdf.destroy(); }, 0);
        if (downloadRef.current) URL.revokeObjectURL(downloadRef.current); downloadRef.current = null; setDownloadReady(null);
        setHistory([added]); setCursor(0); setSavedPages(added); ocrCache.current.clear(); setOcrLines([]);
        const nextName = pdfFilename(files[0].name); setName(nextName); setSavedName(nextName); setStored(document);
      }
      sourcesRef.current = nextSources; setSources(nextSources); setActiveId(added[0].id); setSelected(null); setTool('select'); setZoom('fit');
    } catch (e) { loaded.forEach(item => void item.source.pdf.destroy()); throw e; }
  };
  const upload = (files: File[], append: boolean) => {
    if (!files.length || (!append && dirty && !confirmDiscard())) return;
    void run('PDF openen…', async () => { await install(files, append); if (!append) setParams({}, { replace: true }); toast.success(append ? 'Pagina’s toegevoegd' : 'PDF geopend'); });
  };
  const openStored = async (doc: StoredPdf) => {
    if (dirty && !confirmDiscard()) return;
    await run('Document openen…', async () => { await install([await downloadStoredPdf(doc)], false, doc); setPicker(false); });
  };
  useEffect(() => {
    const id = params.get('document');
    if (!id || lastParam.current === id) return;
    lastParam.current = id;
    void run('Document openen…', async () => { const doc = await getPdfDocument(id); await install([await downloadStoredPdf(doc)], false, doc); });
  }, [params]);
  const openPicker = () => {
    setPicker(true); setQuery(''); setPickerError('');
    void run('Documenten laden…', async () => { try { setDocuments(await listPdfDocuments()); } catch (e) { setPickerError('Documenten konden niet worden geladen. Probeer opnieuw.'); throw e; } });
  };
  const newDocument = () => {
    if (dirty && !confirmDiscard()) return;
    void run('Document aanmaken…', async () => { await install([await blankPdf()], false); setSavedPages([]); setParams({}, { replace: true }); });
  };
  const getExport = async (onlyPage = false) => {
    if (!font.current) { const response = await fetch('/fonts/pdf-editor-sans.ttf'); if (!response.ok) throw new Error('Het lettertype kon niet worden geladen. Probeer opnieuw.'); font.current = new Uint8Array(await response.arrayBuffer()); }
    return exportPdf(onlyPage ? [active] : pages, new Map([...sources].map(([id, source]) => [id, source.bytes])), font.current, name);
  };
  const download = (onlyPage = false) => void run('PDF voorbereiden…', async () => {
    const bytes = await getExport(onlyPage), url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
    const link = document.createElement('a'); link.href = url; link.download = onlyPage ? pdfFilename(`${name.replace(/\.pdf$/i, '')}-pagina-${activeIndex + 1}`) : pdfFilename(name); document.body.appendChild(link); link.click(); link.remove();
    if (downloadRef.current) URL.revokeObjectURL(downloadRef.current);
    downloadRef.current = url; setDownloadReady({ url, filename: link.download });
    if (!onlyPage) { setSavedPages(pages); setSavedName(name); }
    toast.success('PDF klaargezet voor downloaden');
  });
  const prepareSave = () => {
    setSaveMode(stored ? 'version' : 'copy'); setSaveName(stored ? name.replace(/\.pdf$/i, '') + '-bewerkt.pdf' : name); setFolder(stored?.folder_id || ''); setFolderError(''); setSaveDialog(true);
    void run('Mappen laden…', async () => { try { setFolders(await listPdfFolders()); } catch (e) { setFolderError('Mappen konden niet worden geladen. Je kunt wel downloaden.'); throw e; } });
  };
  const save = () => void run('PDF opslaan…', async () => {
    const bytes = await getExport();
    const saved = await saveStoredPdf(bytes, saveMode === 'version' ? stored!.name : saveName, folder || null, saveMode === 'version' ? stored : null);
    setStored(saved); setName(saved.name); setSavedName(saved.name); setSavedPages(pages); setSaveDialog(false);
    toast.success(`Opgeslagen in Documenten · versie ${latestVersion(saved).version}`);
  });

  const chooseTool = (next: PdfTool) => {
    setTool(next); setSelected(null);
    if (next === 'highlight') { setInk('#facc15'); setSize(2); }
    if (next === 'text') { setInk('#172554'); setSize(16); }
    if (next === 'draw' || next === 'rectangle') { setInk('#172554'); setSize(2); }
    if (next === 'image') imageInput.current?.click();
  };
  const editText = (point: Point, mark?: Mark) => { setTextEdit({ point, mark }); setText(mark?.text || ''); if (mark) { setSize(mark.size); setInk(mark.color); } };
  const applyText = async () => {
    if (!text.trim() || !textEdit) return;
    await document.fonts.load(`${size}px HarkasPdfSans`);
    const context = document.createElement('canvas').getContext('2d')!; context.font = `${size}px HarkasPdfSans`;
    const lines = text.replace(/\r/g, '').split('\n'), width = Math.max(...lines.map(line => context.measureText(line).width), 12), height = size * (1 + (lines.length - 1) * 1.3) + size * .25;
    if (width > active.width || height > active.height) { toast.error('Deze tekst past niet op de pagina. Gebruik regeleinden of een kleinere tekstgrootte.'); return; }
    const mark: Mark = { ...textEdit.mark, id: textEdit.mark?.id || uid(), kind: 'text', x: Math.min(textEdit.point.x, active.width - width), y: Math.min(textEdit.point.y, active.height - height), width, height, text: lines.join('\n'), size, color: ink };
    updateMarks(active.marks.some(m => m.id === mark.id) ? active.marks.map(m => m.id === mark.id ? mark : m) : [...active.marks, mark]);
    setTextEdit(null); setSelected(mark.id); setTool('select');
  };
  const readImage = (file: File) => void run('Afbeelding openen…', async () => {
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error('Kies een PNG- of JPG-afbeelding van maximaal 10 MB.');
    const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
    const img = new Image(); img.src = data; await img.decode();
    if (img.naturalWidth * img.naturalHeight > 40_000_000) throw new Error('Deze afbeelding is te groot. Kies een kleinere afbeelding.');
    setImageData({ data, width: img.naturalWidth, height: img.naturalHeight }); setTool('image'); toast.info('Klik op de pagina om de afbeelding te plaatsen.');
  });
  const placeImage = (point: Point) => {
    if (!imageData) { imageInput.current?.click(); return; }
    const factor = Math.min(220 / imageData.width, (active.width * .8) / imageData.width, (active.height * .8) / imageData.height);
    const width = imageData.width * factor, height = imageData.height * factor;
    const mark: Mark = { id: uid(), kind: 'image', x: Math.min(point.x, active.width - width), y: Math.min(point.y, active.height - height), width, height, color: ink, size, image: imageData.data };
    updateMarks([...active.marks, mark]); setSelected(mark.id); setTool('select');
  };
  const duplicate = () => { if (pages.length >= MAX_PAGES) { toast.error(`Maximaal ${MAX_PAGES} pagina’s.`); return; } const copy = { ...active, id: uid(), marks: active.marks.map(m => ({ ...m, id: uid() })) }; const next = [...pages]; next.splice(activeIndex + 1, 0, copy); commit(next); choosePage(copy.id); };
  const deletePage = () => { if (pages.length <= 1) return; const next = pages.filter(p => p.id !== active.id); commit(next); choosePage(next[Math.min(activeIndex, next.length - 1)].id); };
  const changeSelected = (update: Partial<Mark>) => { if (selectedMark) updateMarks(active.marks.map(m => m.id === selected ? { ...m, ...update } : m)); };

  return <div className="pdf-editor">
    <header className="pdf-heading"><div className="pdf-title-group"><div className="pdf-brand-icon"><FileText /></div><div><div className="pdf-eyebrow">HARKAS IT · DOCUMENTTOOLS</div><h1>PDF-editor</h1><p>Open, bewerk en bewaar je documenten.</p></div></div><Link to="/admin/documenten" className="pdf-library-link"><FolderOpen size={16} /> Documenten</Link></header>
    <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" aria-label="PDF uploaden" onChange={e => { upload(Array.from(e.target.files || []), false); e.target.value = ''; }} />
    <input ref={appendInput} type="file" accept="application/pdf,.pdf" multiple className="hidden" aria-label="PDF’s samenvoegen" onChange={e => { upload(Array.from(e.target.files || []), true); e.target.value = ''; }} />
    <input ref={imageInput} type="file" accept="image/png,image/jpeg" className="hidden" aria-label="Afbeelding uploaden" onChange={e => { if (e.target.files?.[0]) readImage(e.target.files[0]); e.target.value = ''; }} />
    {busy && <div className="pdf-progress" role="status"><Loader2 size={16} className="animate-spin" />{busy}{ocrAbort.current && <button className="ml-auto underline" onClick={() => ocrAbort.current?.abort()}>Annuleren</button>}</div>}
    {errorMessage && <div role="alert" className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><span>{errorMessage}</span><button aria-label="Foutmelding sluiten" onClick={() => setErrorMessage('')}><X size={16} /></button></div>}
    {downloadReady && <div className="pdf-recognition-bar mb-3 rounded-lg"><span>Je PDF staat klaar. Start de download niet vanzelf?</span><a href={downloadReady.url} download={downloadReady.filename} className="font-medium underline">Download {downloadReady.filename}</a><button aria-label="Downloadmelding sluiten" onClick={() => { URL.revokeObjectURL(downloadReady.url); downloadRef.current = null; setDownloadReady(null); }}><X size={15} /></button></div>}
    {!active ? <div className="pdf-welcome">
      <div className={`pdf-dropzone ${dragging ? 'is-dragging' : ''}`} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); if (!busy) upload(Array.from(e.dataTransfer.files).slice(0, 1), false); }}>
        <div className="pdf-upload-icon"><Upload size={30} /></div><h2>Je document. Klaar voor de volgende stap.</h2><p>Sleep hier een PDF naartoe of open een bestand vanaf je apparaat.</p>
        <Button size="lg" onClick={() => input.current?.click()} disabled={!!busy}><Upload className="mr-2 h-4 w-4" />PDF uploaden</Button><span className="pdf-file-limit">PDF · maximaal 50 MB · tot 250 pagina’s</span>
        <div className="pdf-start-options"><Button variant="outline" onClick={openPicker} disabled={!!busy}><FolderOpen className="mr-2 h-4 w-4" />Uit Documenten</Button><Button variant="ghost" onClick={newDocument} disabled={!!busy}><FilePlus2 className="mr-2 h-4 w-4" />Lege PDF</Button></div>
      </div>
      <aside className="pdf-welcome-aside"><div className="pdf-eyebrow">ALLES BIJ DE HAND</div><h2>Van eerste opmerking<br />tot de laatste pagina.</h2><div className="pdf-feature"><Type /><div><strong>Bestaande tekst bewerken</strong><p>Klik op tekstregels, behoud de opmaak of herken tekst uit een scan.</p></div></div><div className="pdf-feature"><PenLine /><div><strong>Tekenen & handtekening</strong><p>Teken met je muis, pen of vinger op de PDF.</p></div></div><div className="pdf-feature"><Copy /><div><strong>Pagina’s organiseren</strong><p>Samenvoegen, draaien, verplaatsen en verwijderen.</p></div></div><div className="pdf-private-note"><ShieldCheck size={20} /><p>Je werkt in je browser. Bewaar het resultaat in je privé-documenten of download een kopie.</p></div></aside>
      <p className="pdf-capability-note">Klik op bestaande tekst om deze aan te passen met behoud van de oorspronkelijke opmaak. Gebruik scanherkenning voor ingescande documenten; controleer daarbij de herkende tekst en de benaderde opmaak.</p>
    </div> : <section className="pdf-workbench" aria-label="PDF-werkruimte">
      <div className="pdf-filebar"><div className="pdf-file-details"><FileText size={21} /><div><Input aria-label="PDF-bestandsnaam" value={name} maxLength={220} onChange={e => setName(e.target.value)} onBlur={() => setName(pdfFilename(name))} disabled={!!busy} /><span>{pages.length} {pages.length === 1 ? 'pagina' : 'pagina’s'}<span className="pdf-status-dot">·</span>{dirty ? 'Niet opgeslagen wijzigingen' : stored ? `Documenten · versie ${latestVersion(stored).version}` : 'Lokaal geopend'}</span></div></div><div className="pdf-file-actions"><Button variant="outline" size="sm" disabled={!!busy} onClick={() => input.current?.click()}><FolderOpen size={16} /><span>Openen</span></Button><Button variant="outline" size="sm" disabled={!!busy} onClick={prepareSave}><Save size={16} /><span>Opslaan</span></Button><Button size="sm" disabled={!!busy} onClick={() => download()}><Download size={16} /><span>Downloaden</span></Button></div></div>
      <div className="pdf-toolbar" role="toolbar" aria-label="PDF-gereedschappen"><div className="pdf-tools">{tools.map(item => <button key={item.key} title={item.help} aria-pressed={tool === item.key} className={tool === item.key ? 'is-active' : ''} disabled={!!busy} onClick={() => chooseTool(item.key)}><item.icon size={18} /><span>{item.label}</span></button>)}</div><div className="pdf-history-tools"><button title="Ongedaan maken (Ctrl+Z)" aria-label="Ongedaan maken" disabled={!!busy || cursor === 0} onClick={undo}><Undo2 size={18} /></button><button title="Opnieuw uitvoeren (Ctrl+Shift+Z)" aria-label="Opnieuw uitvoeren" disabled={!!busy || cursor === history.length - 1} onClick={redo}><Redo2 size={18} /></button></div></div>
      {tool === 'existing' && <div className="pdf-recognition-bar" role="status"><span>{detecting ? 'Tekstregels herkennen…' : detectionError || `${textInspection.runs.length} bewerkbare tekstfragmenten${ocrLines.length ? ` · ${ocrLines.length} scanregels` : ''}. Klik op een omlijnde regel.`}{textInspection.skipped > 0 && ' Sommige gegroepeerde of onzichtbare teksten zijn niet rechtstreeks bewerkbaar.'}</span><Button size="sm" variant="outline" disabled={!!busy || detecting} onClick={scanPage}><ScanText size={15} className="mr-2" />Scan herkennen (NL/EN)</Button></div>}
      <div className="pdf-body">
        <aside className="pdf-pages-panel" aria-label="Paginaoverzicht"><div className="pdf-panel-title"><strong>Pagina’s</strong><span>{pages.length}</span></div><div className="pdf-page-list">{pages.map((page, index) => <button key={page.id} className={`pdf-page-item ${active.id === page.id ? 'is-active' : ''}`} onClick={() => choosePage(page.id)} aria-label={`Pagina ${index + 1}`} aria-current={active.id === page.id ? 'page' : undefined} disabled={!!busy}><PdfThumbnail page={page} source={sources.get(page.sourceId)!} /><span>{index + 1}{page.marks.length > 0 && <i title="Bevat bewerkingen" />}</span></button>)}</div><button className="pdf-add-pages" disabled={!!busy} onClick={() => appendInput.current?.click()}><Plus size={16} />PDF toevoegen</button></aside>
        <div className="pdf-stage-column"><div className="pdf-stage-top"><span>Pagina {activeIndex + 1} van {pages.length}</span><div><button aria-label="Uitzoomen" disabled={!!busy || scale <= .25} onClick={() => setZoom(Math.max(.25, scale - .15))}><ZoomOut size={16} /></button><select aria-label="Zoomniveau" value={zoom === 'fit' ? 'fit' : String(zoom)} onChange={e => setZoom(e.target.value === 'fit' ? 'fit' : Number(e.target.value))}><option value="fit">Passend</option>{[...new Set([.5, .75, 1, 1.25, 1.5, 2, ...(typeof zoom === 'number' ? [zoom] : [])])].sort((a, b) => a - b).map(n => <option key={n} value={n}>{Math.round(n * 100)}%</option>)}</select><button aria-label="Inzoomen" disabled={!!busy || scale >= 2.5} onClick={() => setZoom(Math.min(2.5, scale + .15))}><ZoomIn size={16} /></button><button aria-label="Passend maken" onClick={() => setZoom('fit')}><Maximize2 size={16} /></button></div></div>
          <div className="pdf-stage" ref={workspace}><PdfPageView key={active.id} page={active} source={sources.get(active.sourceId)!} scale={scale} tool={tool} color={ink} size={size} selected={selected} disabled={!!busy} onSelect={setSelected} onMarks={updateMarks} onText={point => editText(point)} onImage={placeImage} textRuns={textInspection.runs} ocrLines={ocrLines} onExistingText={setExistingRun} onOcrText={editOcrLine} /></div>
          <div className="pdf-stage-bottom"><span>{tools.find(t => t.key === tool)?.help}</span><div><button aria-label="Vorige pagina" disabled={activeIndex === 0 || !!busy} onClick={() => choosePage(pages[activeIndex - 1].id)}><ChevronLeft size={17} /></button><button aria-label="Volgende pagina" disabled={activeIndex === pages.length - 1 || !!busy} onClick={() => choosePage(pages[activeIndex + 1].id)}><ChevronRight size={17} /></button></div></div>
        </div>
        <aside className="pdf-properties" aria-label="Eigenschappen"><div className="pdf-panel-title"><strong>{selectedMark ? 'Selectie' : 'Gereedschap'}</strong>{selectedMark && <button aria-label="Selectie opheffen" onClick={() => setSelected(null)}><X size={15} /></button>}</div>
          <div className="pdf-property-section"><h3>{selectedMark ? ({ text: 'Tekst', draw: 'Tekening', image: 'Afbeelding', highlight: 'Markering', rectangle: 'Kader' }[selectedMark.kind]) : tools.find(t => t.key === tool)?.label}</h3>
            {(selectedMark?.kind !== 'image' && tool !== 'image' && tool !== 'existing') && <label className="pdf-field">Kleur<div className="pdf-color-row"><input type="color" aria-label="Kleur" value={selectedMark?.color || ink} disabled={!!busy} onChange={e => selectedMark ? changeSelected({ color: e.target.value }) : setInk(e.target.value)} /><span>{selectedMark?.color || ink}</span></div></label>}
            {!selectedMark && ['text', 'draw', 'rectangle'].includes(tool) && <label className="pdf-field">{tool === 'text' ? 'Tekstgrootte' : 'Lijndikte'}<select aria-label={tool === 'text' ? 'Tekstgrootte' : 'Lijndikte'} value={size} onChange={e => setSize(Number(e.target.value))}>{(tool === 'text' ? [10, 12, 14, 16, 18, 24, 32, 48] : [1, 2, 3, 5, 8]).map(n => <option key={n} value={n}>{n} pt</option>)}</select></label>}
            {selectedMark?.kind === 'text' && <Button size="sm" variant="outline" onClick={() => editText({ x: selectedMark.x, y: selectedMark.y }, selectedMark)}>Tekst aanpassen</Button>}
            {selectedMark?.kind === 'image' && <label className="pdf-field">Breedte (pt)<input type="number" min={20} max={Math.floor(Math.min(active.width - selectedMark.x, (active.height - selectedMark.y) * selectedMark.width / selectedMark.height))} value={Math.round(selectedMark.width)} onChange={e => { const max = Math.min(active.width - selectedMark.x, (active.height - selectedMark.y) * selectedMark.width / selectedMark.height); const width = Math.max(20, Math.min(max, Number(e.target.value) || 20)); changeSelected({ width, height: width * selectedMark.height / selectedMark.width }); }} /></label>}
            {selectedMark && <Button variant="ghost" size="sm" className="pdf-delete" disabled={!!busy} onClick={removeMark}><Trash2 size={14} />Selectie verwijderen</Button>}
            {!selectedMark && tool === 'existing' && <p className="pdf-hint">Blauwe kaders bevatten bestaande tekst. Oranje kaders zijn herkende scanregels. Een PDF kan een regel in meerdere tekstfragmenten opslaan.</p>}
            {!selectedMark && tool === 'text' && <Button variant="outline" size="sm" onClick={() => editText({ x: 48, y: 48 })}>Tekst toevoegen</Button>}
            {!selectedMark && tool === 'image' && <Button variant="outline" size="sm" onClick={() => imageInput.current?.click()}>Afbeelding kiezen</Button>}
            <p className="pdf-hint">{selectedMark ? 'Sleep de selectie op de pagina om deze te verplaatsen.' : tools.find(t => t.key === tool)?.help}</p>
          </div>
          <div className="pdf-property-section"><h3>Pagina {activeIndex + 1}</h3><div className="pdf-page-actions"><Button variant="outline" size="sm" disabled={!!busy} onClick={() => commit(pages.map(p => p.id === active.id ? { ...p, rotation: normalizeRotation(p.rotation + 90) } : p))}><RotateCw size={15} />Draaien</Button><Button variant="outline" size="sm" disabled={!!busy} onClick={duplicate}><Copy size={15} />Dupliceren</Button><Button variant="outline" size="sm" disabled={!!busy || activeIndex === 0} onClick={() => commit(movePage(pages, active.id, -1))}><ArrowUp size={15} />Naar voren</Button><Button variant="outline" size="sm" disabled={!!busy || activeIndex === pages.length - 1} onClick={() => commit(movePage(pages, active.id, 1))}><ArrowDown size={15} />Naar achteren</Button><Button variant="outline" size="sm" disabled={!!busy} onClick={() => download(true)}><Download size={15} />Deze pagina</Button><Button variant="ghost" size="sm" className="pdf-delete" disabled={!!busy || pages.length === 1} onClick={deletePage}><Trash2 size={15} />Verwijderen</Button></div></div>
          <div className="pdf-property-section pdf-tips"><ShieldCheck size={18} /><p>Het origineel blijft bewaard. Gebruik <strong>Opslaan</strong> voor een nieuwe versie of <strong>Downloaden</strong> voor een PDF op je apparaat.</p><p>Toevoegingen worden vast in de PDF opgenomen. Een getekende handtekening is geen digitale certificaathandtekening.</p></div>
        </aside>
      </div>
    </section>}

    {existingRun && active && <PdfTextEditorDialog key={`${active.sourceId}-${existingRun.index}`} run={existingRun} source={sources.get(active.sourceId)!} pageIndex={active.index} onClose={() => setExistingRun(null)} onApply={replaceBasePage} />}
    <Dialog open={picker} onOpenChange={v => { if (!busy) setPicker(v); }}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Openen uit Documenten</DialogTitle><DialogDescription>Kies een PDF uit je privé-documenten.</DialogDescription></DialogHeader><Input aria-label="PDF zoeken" placeholder="Zoeken op bestandsnaam…" value={query} onChange={e => setQuery(e.target.value)} /><div className="pdf-document-picker">{pickerError ? <div role="alert"><p>{pickerError}</p><Button onClick={openPicker} disabled={!!busy}>Opnieuw proberen</Button></div> : busy ? <p role="status">{busy}</p> : documents.filter(d => d.name.toLowerCase().includes(query.toLowerCase())).map(d => <button key={d.id} onClick={() => void openStored(d)} disabled={!!busy}><FileText size={20} /><span><strong>{d.name}</strong><small>Versie {latestVersion(d)?.version} · {((latestVersion(d)?.size_bytes || 0) / 1024 / 1024).toFixed(1)} MB</small></span><ChevronRight size={16} /></button>)}{!busy && !pickerError && !documents.filter(d => d.name.toLowerCase().includes(query.toLowerCase())).length && <p>Geen PDF-documenten gevonden.</p>}</div></DialogContent></Dialog>
    <Dialog open={!!textEdit} onOpenChange={v => { if (!v) setTextEdit(null); }}><DialogContent><DialogHeader><DialogTitle>{textEdit?.mark?.ocrLineId ? 'Herkende scantekst aanpassen' : textEdit?.mark ? 'Tekst aanpassen' : 'Tekst toevoegen'}</DialogTitle><DialogDescription>{textEdit?.mark?.ocrLineId ? 'Controleer de herkende tekst. Het lettertype is benaderd met DejaVu Sans; de grootte kun je aanpassen.' : 'Voeg tekst toe aan je PDF. Gebruik regeleinden voor meerdere regels.'}</DialogDescription></DialogHeader><Label htmlFor="pdf-text">Tekst</Label><textarea id="pdf-text" className="pdf-text-input" rows={5} maxLength={3000} value={text} onChange={e => setText(e.target.value)} autoFocus /><div className="pdf-text-settings"><label>Tekstgrootte<select aria-label="Tekstgrootte in tekstvenster" value={size} onChange={e => setSize(Number(e.target.value))}>{[...new Set([10, 12, 14, 16, 18, 24, 32, 48, size])].sort((a,b) => a-b).map(n => <option key={n} value={n}>{n} pt</option>)}</select></label><label>Kleur<input type="color" aria-label="Tekstkleur" value={ink} onChange={e => setInk(e.target.value)} /></label></div>{textEdit?.mark?.cover && <><label className="flex items-center gap-3 text-sm">Achtergrond van de scanregel<input type="color" aria-label="Achtergrond scanregel" value={textEdit.mark.cover.color} onChange={e => setTextEdit({ ...textEdit, mark: { ...textEdit.mark!, cover: { ...textEdit.mark!.cover!, color: e.target.value } } })} /></label><p className="text-xs text-muted-foreground">Herkenningszekerheid: {textEdit.mark.ocrConfidence ?? 0}%. Controleer de tekst. Dit is een visuele correctie: de oude scan blijft onder de nieuwe tekst aanwezig. Gebruik dit niet voor het onleesbaar maken van vertrouwelijke gegevens.</p></>}<Button disabled={!text.trim()} onClick={() => void applyText().catch(fail)}><Check size={16} className="mr-2" />{textEdit?.mark ? 'Aanpassen' : 'Tekst plaatsen'}</Button></DialogContent></Dialog>
    <Dialog open={saveDialog} onOpenChange={v => { if (!busy) setSaveDialog(v); }}><DialogContent><DialogHeader><DialogTitle>Opslaan in Documenten</DialogTitle><DialogDescription>Bewaar je PDF in de privéopslag van Harkas Admin.</DialogDescription></DialogHeader>{stored && <div className="pdf-save-options"><label><input type="radio" name="pdf-save-mode" checked={saveMode === 'version'} onChange={() => setSaveMode('version')} />Nieuwe versie van {stored.name}<small>De vorige versie blijft beschikbaar.</small></label><label><input type="radio" name="pdf-save-mode" checked={saveMode === 'copy'} onChange={() => setSaveMode('copy')} />Opslaan als apart document</label></div>}{saveMode === 'copy' && <><Label htmlFor="pdf-save-name">Bestandsnaam</Label><Input id="pdf-save-name" value={saveName} maxLength={220} onChange={e => setSaveName(e.target.value)} /><Label htmlFor="pdf-save-folder">Map</Label><select id="pdf-save-folder" className="pdf-folder-select" value={folder} onChange={e => setFolder(e.target.value)}><option value="">Geen map</option>{folders.map(f => <option key={f.id} value={f.id}>{folderPath(f, folders)}</option>)}</select></>}{folderError && <p role="alert" className="text-sm text-destructive">{folderError}</p>}<Button disabled={!!busy || !saveName.trim() || (saveMode === 'copy' && !!folderError)} onClick={save}><Save size={16} className="mr-2" />{busy || 'PDF opslaan'}</Button><p className="text-xs text-muted-foreground">Een opgeslagen PDF bevat je toevoegingen als vaste inhoud. Bewerkbare lagen blijven alleen beschikbaar zolang deze editor geopend is.</p></DialogContent></Dialog>
  </div>;
}
