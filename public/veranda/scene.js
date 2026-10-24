import {normalize,COLORS,decimal} from './model.js';
export function sceneSVG(input,{night=false,rotated=false,view='perspective',id='scene'}={}){
const c=normalize(input),w=c.width,d=c.depth,co=COLORS[c.color];
if(view==='plan'){const sx=420/7,sy=280/4.5,W=w*sx,D=d*sy,x=(720-W)/2,y=(480-D)/2;let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"><rect x="${x-25}" y="${y-20}" width="${W+50}" height="25" fill="#b9b9a6"/><text x="360" y="${y-30}" text-anchor="middle" font-size="12" fill="#8b927f">GEVEL</text><rect x="${x}" y="${y}" width="${W}" height="${D}" fill="${c.roof==='glass'?'#bbd1ca55':'#eeeede'}" stroke="${co.hex}" stroke-width="7"/>`;for(let n=1;n<Math.ceil(w);n++)s+=`<path d="M ${x+n*W/Math.ceil(w)} ${y}v${D}" stroke="${co.hex}" stroke-width="3"/>`;if(c.front)s+=`<path d="M${x} ${y+D+7}h${W}" stroke="#80a8ae" stroke-width="5"/>`;if(c.left)s+=`<path d="M${x-7} ${y}v${D}" stroke="#80a8ae" stroke-width="5"/>`;if(c.right)s+=`<path d="M${x+W+7} ${y}v${D}" stroke="#80a8ae" stroke-width="5"/>`;if(c.shade)s+=`<rect x="${x+5}" y="${y+5}" width="${W-10}" height="${D*.65}" fill="#c6b99199"/>`;s+=`<path d="M${x} ${y+D+35}h${W}m-${W} -6v12m${W} -12v12" stroke="#8b967d" fill="none"/><text x="360" y="${y+D+60}" text-anchor="middle" fill="${night?'#d8dfc9':'#6d7b60'}" font-size="15">${decimal(w)} meter</text><text x="${x+W+45}" y="${y+D/2}" text-anchor="middle" fill="${night?'#d8dfc9':'#6d7b60'}" font-size="15" transform="rotate(90 ${x+W+45} ${y+D/2})">${decimal(d)} meter</text></svg>`;return s;}
const p=(x,y,z)=>[360+(x-w/2)*(rotated?-48:48)-(y-d/2)*(rotated?31:31),310+(x-w/2)*(rotated?-13:13)+(y-d/2)*24-z*60];
const coords=a=>a.map(v=>p(...v).map(n=>n.toFixed(2)).join(',')).join(' ');
const poly=(a,fill,stroke='none',sw=1,extra='')=>`<polygon points="${coords(a)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
const line=(a,b,stroke,width=1,extra='')=>{const x=p(...a),y=p(...b);return `<line x1="${x[0]}" y1="${x[1]}" x2="${y[0]}" y2="${y[1]}" stroke="${stroke}" stroke-width="${width}" ${extra}/>`;};
const box=(x,y,z,ww,dd,hh,color,top,side)=>poly([[x,y,z+hh],[x+ww,y,z+hh],[x+ww,y+dd,z+hh],[x,y+dd,z+hh]],top)+poly([[x,y+dd,z],[x+ww,y+dd,z],[x+ww,y+dd,z+hh],[x,y+dd,z+hh]],color)+poly([[x+ww,y,z],[x+ww,y+dd,z],[x+ww,y+dd,z+hh],[x+ww,y,z+hh]],side);
let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 460"><defs><filter id="${id}-shadow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="9"/></filter><radialGradient id="${id}-glow"><stop stop-color="#f9da83" stop-opacity=".7"/><stop offset="1" stop-color="#f9da83" stop-opacity="0"/></radialGradient></defs>`;
s+=poly([[-.5,-.2,0],[w+.6,-.2,0],[w+1.4,d+1,0],[.2,d+1,0]],'#35403133','none',0,`filter="url(#${id}-shadow)"`);
s+=box(-.65,-.55,-.12,w+1.3,d+1.1,.12,night?'#6c776a':'#c5c8b7',night?'#879180':'#d9dcce','#afb6a2');
for(let x=-.5;x<w+.5;x+=.7)s+=line([x,-.5,.003],[x,d+.5,.003],night?'#919b8722':'#acb49a66',.7);for(let y=0;y<d+.5;y+=.65)s+=line([-.6,y,.004],[w+.6,y,.004],night?'#919b8722':'#acb49a66',.7);
s+=box(-.25,-.4,0,w+.5,.3,3.4,night?'#8a8a71':'#d2cbb8',night?'#b7b59a':'#e4decd',night?'#767c68':'#bdbca9');
for(let z=.25;z<3.4;z+=.2)s+=line([-.23,-.09,z],[w+.23,-.09,z],night?'#706e5c55':'#aaa38c44',.6);
s+=poly([[w*.2,-.075,.08],[w*.68,-.075,.08],[w*.68,-.075,2.45],[w*.2,-.075,2.45]],night?'#c3b573':'#697e76',co.hex,6);
s+=line([w*.44,-.07,.08],[w*.44,-.07,2.45],co.hex,3);s+=line([w*.2,-.065,2.1],[w*.68,-.065,2.1],'#dce5c055',2);
// Low modular seating and a timber coffee table.
s+=box(w*.18,.35,.12,w*.48,.72,.38,'#c8c4ad','#eeead7','#abae98');s+=box(w*.18,.3,.5,w*.48,.19,.45,'#d6d1ba','#f0ecdb','#b9bba6');s+=box(w*.17,.35,.35,.16,.8,.45,'#c6c3ad','#e5e1ca','#b4b89f');s+=box(w*.66,.35,.35,.16,.8,.45,'#c6c3ad','#e5e1ca','#b4b89f');s+=box(w*.33,1.5,.08,.08,.65,.42,'#876d4e','#a98c63','#745b3d');s+=box(w*.6,1.5,.08,.08,.65,.42,'#876d4e','#a98c63','#745b3d');s+=box(w*.29,1.4,.47,w*.37,.85,.10,'#ac8c5d','#c2a877','#8a724e');
// Planters give the model a sense of scale.
for(const [xx,yy] of [[w+.3,d-.35],[-.4,.1]]){s+=box(xx,yy,0,.33,.33,.5,'#9c9e88','#b2b59c','#808b75');const q=p(xx+.16,yy+.16,.9);s+=`<ellipse cx="${q[0]}" cy="${q[1]}" rx="15" ry="31" fill="${night?'#4c694c':'#6d845b'}"/><ellipse cx="${q[0]+9}" cy="${q[1]+3}" rx="12" ry="24" fill="${night?'#628057':'#889a6d'}"/>`;}
const height=y=>2.85-y/d*.35;
function wall(x1,y1,x2,y2){let a='';a+=poly([[x1,y1,.05],[x2,y2,.05],[x2,y2,height(y2)-.05],[x1,y1,height(y1)-.05]],night?'#a1c5b31c':'#9dbeb332','#a8bfb088',1);const length=Math.hypot(x2-x1,y2-y1),n=Math.ceil(length/.9);for(let i=0;i<=n;i++){let t=i/n,x=x1+(x2-x1)*t,y=y1+(y2-y1)*t;a+=line([x,y,.04],[x,y,height(y)-.05],co.light,1.5);}a+=line([x1,y1,.05],[x2,y2,.05],co.hex,3);a+=line([x1,y1,.85],[x2,y2,1.8],'#f8fff580',1.3);return a;}
if(c.left)s+=wall(0,0,0,d);if(c.right)s+=wall(w,0,w,d);
// Rear beam, posts and glass roof follow the selected dimensions.
s+=line([0,0,0],[0,0,2.85],co.hex,8);s+=line([w,0,0],[w,0,2.85],co.hex,8);s+=line([0,0,2.85],[w,0,2.85],co.hex,9);
s+=poly([[0,0,2.85],[w,0,2.85],[w,d,2.5],[0,d,2.5]],c.roof==='glass'?(night?'#c5d7b92c':'#c2d8c44d'):'#e0e1cfeb',co.hex,5);
const ribs=Math.ceil(w);for(let i=0;i<=ribs;i++){const x=w*i/ribs;s+=line([x,0,2.87],[x,d,2.52],co.hex,3.8);if(c.roof==='glass'&&i<ribs)s+=poly([[x+.07,.08,2.87],[x+.28,.08,2.87],[x+.7,d-.08,2.53],[x+.49,d-.08,2.53]],'#ffffff24');}
if(c.shade)s+=poly([[.04,.08,2.82],[w-.04,.08,2.82],[w-.04,d*.7,height(d*.7)-.03],[.04,d*.7,height(d*.7)-.03]],'#c7bb94dc',co.light,1);
if(c.led)for(let i=0;i<Math.floor(w);i++){const q=p((i+.5)*w/Math.floor(w),d-.05,2.43);if(night)s+=`<ellipse cx="${q[0]}" cy="${q[1]+40}" rx="42" ry="60" fill="url(#${id}-glow)"/>`;s+=`<ellipse cx="${q[0]}" cy="${q[1]}" rx="3.4" ry="2" fill="${night?'#ffe39b':'#f9edd0'}"/>`;}
if(c.front)s+=wall(0,d,w,d);
s+=line([0,d,0],[0,d,2.5],co.hex,9);s+=line([w,d,0],[w,d,2.5],co.hex,9);s+=line([0,d,2.5],[w,d,2.5],co.hex,11);s+=line([0,0,2.85],[0,d,2.5],co.hex,7);s+=line([w,0,2.85],[w,d,2.5],co.hex,7);s+=line([0,d,2.57],[w,d,2.57],co.light,1.5);if(w>5.5)s+=line([w/2,d,0],[w/2,d,2.5],co.hex,8);
const dim=night?'#c3cdb2':'#879579';s+=line([0,d+.95,0],[w,d+.95,0],dim,1);s+=line([0,d+.8,0],[0,d+1.1,0],dim,1);s+=line([w,d+.8,0],[w,d+1.1,0],dim,1);let mid=p(w/2,d+1.25,0);s+=`<text x="${mid[0]}" y="${mid[1]+12}" text-anchor="middle" fill="${dim}" font-family="Arial,sans-serif" font-size="12">${decimal(w)} meter</text>`;s+=line([w+.8,0,0],[w+.8,d,0],dim,1);mid=p(w+1.05,d/2,0);s+=`<text x="${mid[0]+5}" y="${mid[1]+5}" fill="${dim}" font-family="Arial,sans-serif" font-size="12">${decimal(d)} m</text></svg>`;return s;
}
