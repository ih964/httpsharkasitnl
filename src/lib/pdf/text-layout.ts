import type { EditorPage, Point } from './model';
import type { PdfTextRun } from './text-engine';

export type TextMove = { run: PdfTextRun; dx: number; dy: number };
export type PageArea = Pick<EditorPage, 'transform' | 'width' | 'height'>;
export function viewPoint(matrix: number[], x: number, y: number): Point {
  return { x: matrix[0] * x + matrix[2] * y + matrix[4], y: matrix[1] * x + matrix[3] * y + matrix[5] };
}
export function textBox(run: PdfTextRun, page: PageArea) {
  const [l,b,r,t] = run.bounds;
  const points = [[l,b],[l,t],[r,b],[r,t]].map(([x,y]) => viewPoint(page.transform,x,y));
  const x = Math.min(...points.map(p => p.x)), y = Math.min(...points.map(p => p.y));
  return { x, y, width: Math.max(...points.map(p => p.x)) - x, height: Math.max(...points.map(p => p.y)) - y };
}
export function pdfDelta(page: PageArea, delta: Point): Point {
  const [a,b,c,d] = page.transform, det = a*d-b*c;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-8) throw new Error('Ongeldige paginageometrie.');
  return { x: (d*delta.x-c*delta.y)/det, y: (-b*delta.x+a*delta.y)/det };
}
/** Convert screen arrows to the unrotated overlay; native rotation is in page.transform. */
export function screenDelta(delta: Point, rotation: number): Point {
  return rotation === 90 ? { x:delta.y,y:-delta.x } : rotation === 180 ? { x:-delta.x,y:-delta.y } : rotation === 270 ? { x:-delta.y,y:delta.x } : delta;
}
export function translated(run: PdfTextRun, dx: number, dy: number): PdfTextRun {
  return { ...run, bounds: [run.bounds[0]+dx,run.bounds[1]+dy,run.bounds[2]+dx,run.bounds[3]+dy], matrix: [...run.matrix.slice(0,4),run.matrix[4]+dx,run.matrix[5]+dy] };
}
export function fitsPage(run: PdfTextRun, page: PageArea) {
  const box = textBox(run,page), tolerance = .5;
  return box.x >= -tolerance && box.y >= -tolerance && box.x+box.width <= page.width+tolerance && box.y+box.height <= page.height+tolerance;
}
function axis(run: PdfTextRun) {
  const length = Math.hypot(run.matrix[0],run.matrix[1]);
  return { x:run.matrix[0]/(length || 1), y:run.matrix[1]/(length || 1) };
}
function parallel(a: PdfTextRun, b: PdfTextRun) {
  const u=axis(a),v=axis(b); return u.x*v.x+u.y*v.y > .999;
}
function extent(run: PdfTextRun, u: Point) {
  const [l,b,r,t] = run.bounds, values = [[l,b],[l,t],[r,b],[r,t]].map(([x,y]) => x*u.x+y*u.y);
  return { start:Math.min(...values), end:Math.max(...values) };
}
export function alignTextRuns(runs: PdfTextRun[]): TextMove[] {
  if (runs.length < 2) return [];
  const first=runs[0], u=axis(first), n={x:-u.y,y:u.x};
  if (!runs.every(run => parallel(first,run))) throw new Error('Kies tekstvakken met dezelfde tekstrichting om ze op één regel te zetten.');
  return runs.slice(1).map(run => {
    const distance=(first.matrix[4]-run.matrix[4])*n.x+(first.matrix[5]-run.matrix[5])*n.y;
    return {run,dx:n.x*distance,dy:n.y*distance};
  });
}
/** Only contiguous fragments on the same baseline flow; stop at a column-sized gap. */
export function flowFollowingText(before: PdfTextRun, after: PdfTextRun, runs: PdfTextRun[]): TextMove[] {
  const u=axis(before), n={x:-u.y,y:u.x}, original=extent(before,u);
  const em=before.size*Math.hypot(before.matrix[2],before.matrix[3]);
  const candidates=runs.filter(run => run.index!==before.index && parallel(before,run)
    && Math.abs((run.matrix[4]-before.matrix[4])*n.x+(run.matrix[5]-before.matrix[5])*n.y) <= Math.max(.5,Math.min(2,em*.15))
    && extent(run,u).start > original.start+.1).sort((a,b)=>extent(a,u).start-extent(b,u).start);
  const group: PdfTextRun[]=[];
  let edge=original.end;
  for (const candidate of candidates) {
    const range=extent(candidate,u);
    if (range.start-edge > Math.max(12,em*2)) break;
    group.push(candidate); edge=Math.max(edge,range.end);
  }
  if (!group.length) return [];
  const next=extent(group[0],u), gap=Math.max(em*.2,next.start-original.end);
  const distance=Math.max(0,extent(after,u).end+gap-next.start);
  return distance > .01 ? group.map(run=>({run,dx:distance*u.x,dy:distance*u.y})) : [];
}
export function dragTextRuns(runs: PdfTextRun[], all: PdfTextRun[], page: PageArea, delta: Point, snapDistance: number) {
  if (!runs.length) return { delta, moves:[] as TextMove[], guide:undefined as [Point,Point] | undefined };
  const boxes=runs.map(run=>textBox(run,page));
  const clamp=(value:Point):Point=>({
    x:Math.max(-Math.min(...boxes.map(b=>b.x)),Math.min(page.width-Math.max(...boxes.map(b=>b.x+b.width)),value.x)),
    y:Math.max(-Math.min(...boxes.map(b=>b.y)),Math.min(page.height-Math.max(...boxes.map(b=>b.y+b.height)),value.y)),
  });
  let bounded=clamp(delta), native=pdfDelta(page,bounded), guide: [Point,Point] | undefined;
  if (runs.length===1 && snapDistance>0) {
    const moving=translated(runs[0],native.x,native.y);
    const candidates=all.filter(run=>run.index!==moving.index && parallel(moving,run)).map(run=>{
      const move=alignTextRuns([run,moving])[0], vector={x:page.transform[0]*move.dx+page.transform[2]*move.dy,y:page.transform[1]*move.dx+page.transform[3]*move.dy};
      return {run,vector,distance:Math.hypot(vector.x,vector.y)};
    }).filter(item=>item.distance<=snapDistance).sort((a,b)=>a.distance-b.distance);
    if (candidates[0]) {
      const {run,vector}=candidates[0], target={x:bounded.x+vector.x,y:bounded.y+vector.y}, safe=clamp(target);
      if (Math.hypot(safe.x-target.x,safe.y-target.y)<.01) {
        bounded=safe; native=pdfDelta(page,bounded);
        guide=[viewPoint(page.transform,run.matrix[4],run.matrix[5]),viewPoint(page.transform,moving.matrix[4],moving.matrix[5])];
        guide[1]={x:guide[1].x+vector.x,y:guide[1].y+vector.y};
      }
    }
  }
  return {delta:bounded,moves:runs.map(run=>({run,dx:native.x,dy:native.y})),guide};
}
