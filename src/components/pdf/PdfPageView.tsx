import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { RenderTask } from 'pdfjs-dist';
import { type EditorPage, type Mark, type Point, uid } from '@/lib/pdf/model';
import type { PdfSource } from '@/lib/pdf/renderer';
import type { PdfTextRun } from '@/lib/pdf/text-engine';
import type { OcrLine } from '@/lib/pdf/ocr';

export type PdfTool = 'select' | 'existing' | 'text' | 'highlight' | 'draw' | 'rectangle' | 'image';

export function MarkGraphic({ mark }: { mark: Mark }) {
  if (mark.kind === 'text') return <>{mark.cover && <rect x={mark.cover.x} y={mark.cover.y} width={mark.cover.width} height={mark.cover.height} fill={mark.cover.color} />}<text x={mark.x} y={mark.y + mark.size} fill={mark.color} fontSize={mark.size} fontFamily="HarkasPdfSans, sans-serif" xmlSpace="preserve">{(mark.text || '').split('\n').map((line, i) => <tspan key={i} x={mark.x} dy={i ? mark.size * 1.3 : 0}>{line || ' '}</tspan>)}</text></>;
  if (mark.kind === 'image') return <image href={mark.image} x={mark.x} y={mark.y} width={mark.width} height={mark.height} preserveAspectRatio="none" />;
  if (mark.kind === 'draw') return <polyline points={mark.points?.map(p => `${p.x + mark.x},${p.y + mark.y}`).join(' ')} fill="none" stroke={mark.color} strokeWidth={mark.size} strokeLinecap="round" strokeLinejoin="round" />;
  return <rect x={mark.x} y={mark.y} width={mark.width} height={mark.height} fill={mark.kind === 'highlight' ? mark.color : 'none'} fillOpacity={mark.kind === 'highlight' ? 0.3 : 0} stroke={mark.kind === 'rectangle' ? mark.color : 'none'} strokeWidth={mark.size} />;
}

export function PdfCanvas({ page, source, scale, onError }: { page: EditorPage; source: PdfSource; scale: number; onError?: (message: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let canceled = false, task: RenderTask | undefined;
    setError('');
    void (async () => {
      try {
        const original = await source.pdf.getPage(page.index + 1);
        if (canceled || !canvas.current) return;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const renderScale = Math.min(scale * ratio, Math.sqrt(12_000_000 / (page.width * page.height)));
        const viewport = original.getViewport({ scale: renderScale });
        canvas.current.width = Math.ceil(viewport.width); canvas.current.height = Math.ceil(viewport.height);
        task = original.render({ canvas: canvas.current, viewport });
        await task.promise;
      } catch (e) {
        if (!canceled && (e as Error).name !== 'RenderingCancelledException') {
          setError('Pagina kon niet worden weergegeven.'); onError?.('Pagina kon niet worden weergegeven. Open het document opnieuw.');
        }
      }
    })();
    return () => { canceled = true; task?.cancel(); };
  }, [source, page.index, page.width, page.height, scale, onError]);
  return <><canvas ref={canvas} className="pdf-canvas" aria-label="PDF-paginavoorbeeld" />{error && <span role="alert" className="pdf-render-error">{error}</span>}</>;
}

export function pageTransform(page: EditorPage, scale: number) {
  const w = page.width * scale, h = page.height * scale;
  return page.rotation === 90 ? `translate(${h}px,0) rotate(90deg)` : page.rotation === 180 ? `translate(${w}px,${h}px) rotate(180deg)` : page.rotation === 270 ? `translate(0,${w}px) rotate(270deg)` : undefined;
}

export function PdfThumbnail({ page, source }: { page: EditorPage; source: PdfSource }) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => setVisible(entries[0].isIntersecting), { rootMargin: '150px' });
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const side = page.rotation % 180 ? page.height : page.width;
  const scale = 104 / side;
  return <div ref={container} className="pdf-thumb-paper" style={{ width: 104, height: (page.rotation % 180 ? page.width : page.height) * scale }}><div className="pdf-paper-inner" style={{ width: page.width * scale, height: page.height * scale, transform: pageTransform(page, scale) }}>{visible && <PdfCanvas page={page} source={source} scale={scale} />}<svg className="pdf-overlay" viewBox={`0 0 ${page.width} ${page.height}`} aria-hidden="true">{page.marks.map(mark => <MarkGraphic key={mark.id} mark={mark} />)}</svg></div></div>;
}

type Props = {
  page: EditorPage; source: PdfSource; scale: number; tool: PdfTool; color: string; size: number;
  selected: string | null; disabled: boolean;
  onSelect: (id: string | null) => void; onMarks: (marks: Mark[]) => void;
  onText: (point: Point) => void; onImage: (point: Point) => void;
  textRuns: PdfTextRun[]; ocrLines: OcrLine[]; onExistingText: (run: PdfTextRun) => void; onOcrText: (line: OcrLine) => void;
};
export function PdfPageView({ page, source, scale, tool, color, size, selected, disabled, onSelect, onMarks, onText, onImage, textRuns, ocrLines, onExistingText, onOcrText }: Props) {
  const [draft, setDraft] = useState<Mark | null>(null);
  const gesture = useRef<{ start: Point; mark: Mark; moving: boolean; changed: boolean } | null>(null);
  const draftRef = useRef<Mark | null>(null);
  const updateDraft = (mark: Mark | null) => { draftRef.current = mark; setDraft(mark); };
  useEffect(() => { gesture.current = null; updateDraft(null); }, [page.id, tool]);
  const point = (event: PointerEvent<SVGSVGElement>): Point => {
    const matrix = event.currentTarget.getScreenCTM();
    const pt = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix!.inverse());
    return { x: Math.max(0, Math.min(page.width, pt.x)), y: Math.max(0, Math.min(page.height, pt.y)) };
  };
  const down = (event: PointerEvent<SVGSVGElement>) => {
    if (disabled || event.button !== 0 || tool === 'existing') return;
    const start = point(event);
    if (tool === 'text') { onText(start); return; }
    if (tool === 'image') { onImage(start); return; }
    const markId = (event.target as Element).closest('[data-mark]')?.getAttribute('data-mark');
    if (tool === 'select') {
      onSelect(markId || null);
      const mark = page.marks.find(m => m.id === markId);
      if (!mark) return;
      gesture.current = { start, mark, moving: true, changed: false };
    } else {
      const mark: Mark = { id: uid(), kind: tool, x: start.x, y: start.y, width: 0, height: 0, color, size, points: tool === 'draw' ? [{ x: 0, y: 0 }] : undefined };
      gesture.current = { start, mark, moving: false, changed: false }; updateDraft(mark);
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const move = (event: PointerEvent<SVGSVGElement>) => {
    const g = gesture.current; if (!g) return;
    const current = point(event), dx = current.x - g.start.x, dy = current.y - g.start.y;
    if (Math.abs(dx) + Math.abs(dy) < 1 && !g.changed) return;
    g.changed = true;
    if (g.moving) updateDraft({ ...g.mark, x: Math.max(0, Math.min(page.width - g.mark.width, g.mark.x + dx)), y: Math.max(0, Math.min(page.height - g.mark.height, g.mark.y + dy)) });
    else if (g.mark.kind === 'draw') {
      const points = [...(draftRef.current?.points || []), { x: dx, y: dy }];
      updateDraft({ ...g.mark, points });
    } else updateDraft({ ...g.mark, x: Math.min(g.start.x, current.x), y: Math.min(g.start.y, current.y), width: Math.abs(dx), height: Math.abs(dy) });
  };
  const up = () => {
    const g = gesture.current; let mark = draftRef.current;
    if (g && mark && g.changed) {
      if (mark.kind === 'draw' && !g.moving) {
        const points = mark.points!, xs = points.map(p => p.x), ys = points.map(p => p.y), minX = Math.min(...xs), minY = Math.min(...ys);
        mark = { ...mark, x: mark.x + minX, y: mark.y + minY, width: Math.max(...xs) - minX || 1, height: Math.max(...ys) - minY || 1, points: points.map(p => ({ x: p.x - minX, y: p.y - minY })) };
      }
      if (g.moving) onMarks(page.marks.map(m => m.id === mark!.id ? mark! : m));
      else if (mark.kind === 'draw' || (mark.width > 2 && mark.height > 2)) { onMarks([...page.marks, mark]); onSelect(mark.id); }
    }
    gesture.current = null; updateDraft(null);
  };
  const marks = draft ? [...page.marks.filter(m => m.id !== draft.id), draft] : page.marks;
  const selectedMark = marks.find(m => m.id === selected);
  return <div className="pdf-paper" style={{ width: (page.rotation % 180 ? page.height : page.width) * scale, height: (page.rotation % 180 ? page.width : page.height) * scale }}>
    <div className="pdf-paper-inner" style={{ width: page.width * scale, height: page.height * scale, transform: pageTransform(page, scale) }}>
      <PdfCanvas page={page} source={source} scale={scale} />
      <svg className={`pdf-overlay pdf-tool-${tool}`} viewBox={`0 0 ${page.width} ${page.height}`} role="img" aria-label="Bewerkbare PDF-pagina" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { gesture.current = null; updateDraft(null); }}>
        {marks.map(mark => <g key={mark.id} data-mark={mark.id} className={tool === 'select' ? 'pdf-selectable' : undefined}>
          <MarkGraphic mark={mark} />
          {tool === 'select' && <rect x={mark.x - 3} y={mark.y - 3} width={mark.width + 6} height={mark.height + 6} fill="transparent" />}
        </g>)}
        {selectedMark && tool === 'select' && <rect x={selectedMark.x - 3} y={selectedMark.y - 3} width={selectedMark.width + 6} height={selectedMark.height + 6} fill="none" stroke="#2563eb" strokeWidth={1.3 / scale} strokeDasharray={`${4 / scale} ${3 / scale}`} pointerEvents="none" />}
      </svg>
      {tool === 'existing' && <div className="pdf-existing-layer" aria-label="Herkende tekstregels">
        {textRuns.map(run => {
          const [left, bottom, right, top] = run.bounds, [a,b,c,d,e,f] = page.transform;
          const corners = [[left,bottom],[left,top],[right,bottom],[right,top]].map(([x,y]) => [a*x+c*y+e,b*x+d*y+f]);
          const x = Math.min(...corners.map(p => p[0])), y = Math.min(...corners.map(p => p[1]));
          const width = Math.max(...corners.map(p => p[0])) - x, height = Math.max(...corners.map(p => p[1])) - y;
          return <button key={run.index} className="pdf-text-hit" disabled={disabled} aria-label={`Tekst bewerken: ${run.text}`} title={`${run.font} · ${run.size.toFixed(1)} pt — ${run.text}`} style={{ left:(x-2)*scale, top:(y-2)*scale, width:Math.max(8,width+4)*scale, height:Math.max(8,height+4)*scale }} onClick={() => onExistingText(run)} />;
        })}
        {ocrLines.filter(line => !page.marks.some(mark => mark.ocrLineId === line.id)).map(line => <button key={line.id} className="pdf-text-hit pdf-ocr-hit" disabled={disabled} aria-label={`Scantekst bewerken: ${line.text}`} title={`Scan · zekerheid ${line.confidence}% — ${line.text}`} style={{left:(line.x-2)*scale,top:(line.y-2)*scale,width:(line.width+4)*scale,height:(line.height+4)*scale}} onClick={() => onOcrText(line)} />)}
      </div>}
    </div>
  </div>;
}
