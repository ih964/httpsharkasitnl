import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { EditorPage, Point } from '@/lib/pdf/model';
import type { PdfTextRun } from '@/lib/pdf/text-engine';
import { dragTextRuns, textBox, type TextMove } from '@/lib/pdf/text-layout';

type Props = {
  page: EditorPage; runs: PdfTextRun[]; scale: number; selected: number[]; disabled: boolean; snap: boolean;
  onSelect: (indexes: number[]) => void; onMove: (moves: TextMove[]) => void; onEdit: (run: PdfTextRun) => void;
};
export function PdfTextMoveLayer({ page, runs, scale, selected, disabled, snap, onSelect, onMove, onEdit }: Props) {
  const svg=useRef<SVGSVGElement>(null);
  const gesture=useRef<{ start:Point; runs:PdfTextRun[]; moved:boolean } | null>(null);
  const [draft,setDraft]=useState<ReturnType<typeof dragTextRuns> | null>(null), draftRef=useRef(draft);
  const update=(next: typeof draft)=>{draftRef.current=next;setDraft(next);};
  const cancel=()=>{gesture.current=null;update(null);};
  useEffect(()=>{gesture.current=null;draftRef.current=null;setDraft(null);},[page.sourceId,page.index]);
  const point=(event: PointerEvent)=>{
    const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.current!.getScreenCTM()!.inverse());
    return {x:p.x,y:p.y};
  };
  const down=(event: PointerEvent<SVGSVGElement>)=>{
    if (disabled || event.button!==0) return;
    const id=(event.target as Element).closest('[data-text-index]')?.getAttribute('data-text-index');
    if (id==null) {onSelect([]);return;}
    const index=Number(id), extend=event.shiftKey||event.ctrlKey||event.metaKey;
    const ids=extend ? selected.includes(index) ? selected.filter(n=>n!==index) : [...selected,index] : selected.includes(index) ? selected : [index];
    onSelect(ids);
    (event.target as SVGElement).focus();
    if (!ids.includes(index)) return;
    gesture.current={start:point(event),runs:ids.map(n=>runs.find(run=>run.index===n)!).filter(Boolean),moved:false};
    event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault();
  };
  const move=(event: PointerEvent<SVGSVGElement>)=>{
    const g=gesture.current; if (!g || disabled) return;
    const p=point(event), delta={x:p.x-g.start.x,y:p.y-g.start.y};
    if (!g.moved && Math.hypot(delta.x,delta.y)*scale<3) return;
    g.moved=true;
    update(dragTextRuns(g.runs,runs,page,delta,snap&&!event.altKey ? 5/scale : 0));
  };
  const up=(event:PointerEvent<SVGSVGElement>)=>{
    if (!disabled && gesture.current?.moved && draftRef.current) onMove(draftRef.current.moves);
    cancel();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return <svg ref={svg} className="pdf-overlay pdf-move-layer" viewBox={`0 0 ${page.width} ${page.height}`} aria-label="Tekstvakken verplaatsen" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel} onLostPointerCapture={cancel} onKeyDown={event=>{if(event.key==='Escape') cancel();}}>
    {runs.map(run=>{
      const box=textBox(run,page), active=selected.includes(run.index), moving=draft?.moves.some(move=>move.run.index===run.index);
      const dx=moving ? draft!.delta.x : 0, dy=moving ? draft!.delta.y : 0;
      return <rect key={run.index} data-text-index={run.index} role="button" tabIndex={disabled?-1:0} aria-disabled={disabled} aria-pressed={active} aria-label={`Tekstvak verplaatsen: ${run.text}`} className={`pdf-move-hit ${active?'is-selected':''}`} x={box.x-2+dx} y={box.y-2+dy} width={Math.max(8,box.width+4)} height={Math.max(8,box.height+4)} strokeWidth={1/scale} strokeDasharray={active?undefined:`${3/scale} ${2/scale}`} onDoubleClick={()=>{if(!disabled)onEdit(run);}} onKeyDown={event=>{
        if(disabled) return;
        if(event.key===' '){event.preventDefault();onSelect(event.shiftKey ? selected.includes(run.index)?selected.filter(n=>n!==run.index):[...selected,run.index] : [run.index]);}
        if(event.key==='Enter'){event.preventDefault();onEdit(run);}
      }}><title>{run.text} — sleep om te verplaatsen; Shift+klik voor meerdere</title></rect>;
    })}
    {draft?.guide && <line x1={draft.guide[0].x} y1={draft.guide[0].y} x2={draft.guide[1].x} y2={draft.guide[1].y} stroke="#db2777" strokeWidth={1.5/scale} pointerEvents="none" />}
  </svg>;
}
