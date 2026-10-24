import test from 'node:test';
import assert from 'node:assert/strict';
import { newDraft, calculate, makeQuote, DEFAULT_RATES, validateRequest, volume, dateAfter, initialState, loadState, saveState } from '../public/verhuizen/model.js';

test('a checked 4-hour move with 2 movers and 50 km totals €707.85 incl VAT', () => {
 const r={...newDraft(),items:{sofa:1,box:20}};
 const c=calculate(r,DEFAULT_RATES,{hours:4,movers:2,km:50});
 assert.equal(c.m3,4.5); assert.equal(c.subtotal,585);assert.equal(c.vat,122.85);assert.equal(c.total,707.85);
});
test('extras are optional and increase quote by the published rates',()=>{
 const r={...newDraft(),items:{bed:1,box:10}};
 const before=calculate(r,DEFAULT_RATES,{hours:2,movers:2,km:0});
 r.extras={packing:true,assembly:true,lift:true};
 const after=calculate(r,DEFAULT_RATES,{hours:2,movers:2,km:0});
 assert.equal(after.subtotal-before.subtotal,302.5);
});
test('quote snapshot does not change when tariffs or request change',()=>{
 const r={...newDraft(),items:{sofa:1},name:'Test'}; const rates={...DEFAULT_RATES};
 const q=makeQuote(r,rates,{hours:4,movers:2,km:50});
 rates.hourly=100;r.items.sofa=8;r.name='Changed';
 assert.equal(q.total,707.85);assert.equal(q.request.items.sofa,1);assert.equal(q.request.name,'Test');
});
test('invalid staffing, hours, distances and tariffs cannot be quoted',()=>{
 for(const input of [{hours:-1},{hours:NaN},{movers:0},{movers:1.5},{km:-5},{km:Infinity}])assert.throws(()=>calculate(newDraft(),DEFAULT_RATES,input));
 assert.throws(()=>calculate(newDraft(),{...DEFAULT_RATES,hourly:-1}));
});
test('incomplete, past-dated and empty requests are rejected',()=>{
 const r=newDraft();assert.ok(validateRequest(r,0));r.from='Test A';r.to='Test B';r.date='2020-01-01';assert.ok(validateRequest(r,0));r.date=dateAfter(2);assert.equal(validateRequest(r,0),'');assert.ok(validateRequest(r,1));assert.ok(validateRequest(r,3));r.name='Test';r.email='demo@example.invalid';r.phone='0600000000';assert.equal(validateRequest(r,3),'');
});
test('an accepted quote survives reload with its snapshot',()=>{
 const state=initialState();let raw;const storage={getItem:()=>raw,setItem:(_,v)=>raw=v};saveState(storage,state);const next=loadState(storage);const accepted=next.requests.find(r=>r.status==='akkoord');assert.ok(accepted.quote.acceptedBy);assert.deepEqual(next,state);raw='{';assert.equal(loadState(storage).requests.length,3);
});
test('negative or excessive inventory quantities are bounded',()=>{assert.equal(volume({sofa:-1}),0);assert.equal(volume({box:1000}),10);});

test('custom dimensions and quantity feed into volume and packing cost', () => {
 const r={...newDraft(),items:{box:10},customItems:[{id:'custom-a',name:'Aquarium',quantity:2,length:100,width:50,height:80,special:true}]};
 r.extras.packing=true;
 assert.equal(volume(r.items,r.customItems),1.8);
 const quote=makeQuote(r,DEFAULT_RATES,{hours:3,movers:2,km:10});
 assert.equal(quote.lines.find(line=>line.name.startsWith('Inpakservice')).amount,13.5);
 r.customItems[0].quantity=10;
 assert.equal(quote.request.customItems[0].quantity,2);
 assert.equal(quote.m3,1.8);
});
test('an unknown custom object can be requested but requires planner volume before a quote',()=>{
 const r={...newDraft(),customItems:[{id:'custom-b',name:'Maatwerkkast',quantity:2,length:'',width:'',height:''}]};
 assert.equal(validateRequest(r,1),'');
 assert.equal(calculate(r).incomplete,true);
 assert.throws(()=>makeQuote(r,DEFAULT_RATES,{hours:3,movers:2,km:10}),/aanvullende inhoud/);
 assert.equal(makeQuote(r,DEFAULT_RATES,{}, {allowIncomplete:true}).incomplete,true);
 const q=makeQuote(r,DEFAULT_RATES,{extraM3:4,hours:4,movers:2,km:10});
 assert.equal(q.incomplete,false);assert.equal(q.m3,4);assert.equal(q.extraM3,4);
});
test('partial dimensions and invalid quantities are rejected before request submission',()=>{
 for(const item of [{name:'Test',quantity:1,length:100,width:'',height:100},{name:'Test',quantity:0},{name:'Test',quantity:1.5},{name:'',quantity:1},{name:'Test',quantity:1,length:0,width:50,height:80}]){
  assert.ok(validateRequest({...newDraft(),customItems:[item]},1));
 }
 for(const extraM3 of [-1,NaN,Infinity,1001])assert.throws(()=>calculate(newDraft(),DEFAULT_RATES,{extraM3}));
});
test('old browser data is upgraded without losing requests, drafts or quoted prices',()=>{
 const old=initialState();delete old.draft.customItems;old.draft.items={washer:2};
 old.requests.forEach(r=>delete r.customItems);
 const amount=old.requests[2].quote.total;
 const restored=loadState({getItem:()=>JSON.stringify(old)});
 assert.deepEqual(restored.draft.customItems,[]);assert.equal(restored.draft.items.washer,2);
 assert.equal(restored.requests[2].quote.total,amount);assert.equal(restored.requests.length,3);
});
