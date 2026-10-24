import {test} from 'node:test';import assert from 'node:assert/strict';
import {DEFAULT,normalize,pricing,validateRequests,seedRequests,esc,validPreferredDate} from '../public/veranda/model.js';
import {sceneSVG} from '../public/veranda/scene.js';
test('Default quote: independent sum of frame, glass and montage',()=>{const p=pricing(DEFAULT);assert.equal(p.total,1100+15*160+15*95+650+15*25);assert.equal(p.total,5950);assert.equal(p.net+p.vat,p.total)});
test('All optional line items calculate against actual dimensions',()=>{const c={...DEFAULT,width:6,depth:4,color:'black',front:true,left:true,right:true,led:true,shade:true,mount:false};const expected=1100+24*160+24*95+250+6*390+2*4*340+395+24*85;const p=pricing(c);assert.equal(p.total,expected);assert.equal(p.lines.some(l=>l.label==='Standaardmontage'),false);assert.equal(pricing({...c,roof:'poly'}).total,expected-24*50)});
test('Invalid shared configs cannot create NaN, negative totals, unexpected colors or string booleans',()=>{const c=normalize({width:-99,depth:Infinity,color:'__proto__',roof:'evil',front:'true'});assert.equal(c.width,3);assert.equal(c.depth,3);assert.equal(c.color,'anthracite');assert.equal(c.front,false);assert.equal(normalize({width:99}).width,7);assert.ok(Number.isFinite(pricing(c).total));assert.equal(normalize({width:5.24}).width,5)});
test('Storage records are validated, bounded and normalized',()=>{assert.equal(validateRequests({}),null);assert.deepEqual(validateRequests([{name:'<script>'}]),[]);const r=seedRequests();assert.equal(validateRequests(r).length,5);assert.equal(validateRequests([...r,{...r[0],created:'bad'}]).length,5);assert.equal(validateRequests([{...r[0],config:{width:100}}])[0].config.width,7);assert.equal(esc('<img onerror="x">'),'&lt;img onerror=&quot;x&quot;&gt;')});
test('Appointment preferences reject old or invalid dates',()=>{assert.ok(validPreferredDate(''));assert.equal(validPreferredDate('2000-01-01'),false);assert.equal(validPreferredDate('2030-02-30'),false);assert.equal(validPreferredDate('2035-12-01'),true)});
test('Every configuration boundary renders valid finite SVG coordinates',()=>{for(const width of [3,7])for(const depth of [2.5,4.5])for(const view of ['perspective','plan'])for(const rotated of [false,true]){const s=sceneSVG({...DEFAULT,width,depth,front:true,left:true,right:true,led:true,shade:true},{view,rotated,night:true});assert.ok(s.startsWith('<svg'));assert.ok(s.endsWith('</svg>'));assert.ok(!s.includes('NaN'));assert.ok(!s.includes('undefined'));assert.ok(!s.includes('Infinity'))}});

import {readFileSync} from 'node:fs';
test('Subpath assets and routing keep the existing app and API intact',()=>{
 const cfg=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 const route=path=>cfg.rewrites.find(r=>new RegExp('^'+r.source+'$').test(path));
 assert.equal(route('/veranda').destination,'/veranda/index.html');
 assert.equal(route('/veranda/').destination,'/veranda/index.html');
 for(const path of ['/veranda/app.js','/veranda/model.js','/veranda/scene.js','/veranda/styles.css','/veranda/assets/hero.svg'])assert.equal(route(path),undefined,path);
 for(const path of ['/','/admin','/demo/installatiebedrijf','/portfolio'])assert.equal(route(path).destination,'/index.html',path);
 assert.equal(route('/api/quotes'),undefined);
 const html=readFileSync(new URL('../public/veranda/index.html',import.meta.url),'utf8');
 assert.ok(html.includes('src="/veranda/app.js"'));
 assert.ok(html.includes('href="/veranda/styles.css"'));
 assert.ok(!html.includes('signin-with-chatgpt'));
});
