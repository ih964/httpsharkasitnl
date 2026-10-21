import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importInbound } from '../server/support-inbound.ts';
function client(status, allowed = true, imported = false) {
  const writes = [];
  return { writes, async query(sql, params) {
    if (sql.includes('harkas_resilience_state')) return {rows:[{allowed:true}]};
    if (sql.startsWith('SELECT * FROM harkas_support_private.inbound')) return {rows:[{status:imported?'imported':'review',sender:'test@example.com',body:'Nog niet opgelost'}]};
    if (sql.startsWith('SELECT * FROM public.support_tickets')) return {rows:[{status,customer_id:'customer'}]};
    if (sql.includes('FROM public.support_portal_access')) return {rows:allowed?[{}]:[]};
    if (sql.startsWith('SELECT')) return {rows:[]};
    writes.push({sql,params}); return {rows:[]};
  }};
}
for (const status of ['opgelost','gesloten']) test(`reopens ${status} and imports reply`,async()=>{
  const db=client(status); assert.equal(await importInbound(db,'mail','ticket'),true);
  assert.equal(db.writes.filter(x=>x.sql.startsWith('UPDATE public.support_tickets')).length,1);
  assert.equal(db.writes.filter(x=>x.sql.startsWith('INSERT INTO public.support_ticket_messages')).length,1);
});
test('unauthorized sender cannot reopen or post',async()=>{
  const db=client('gesloten',false); assert.equal(await importInbound(db,'mail','ticket'),false); assert.equal(db.writes.length,0);
});
test('active status stays unchanged',async()=>{
  const db=client('nieuw'); await importInbound(db,'mail','ticket'); assert.equal(db.writes.some(x=>x.sql.startsWith('UPDATE public.support_tickets')),false);
});
test('already imported mail cannot produce duplicate reply',async()=>{
  const db=client('gesloten',true,true); await assert.rejects(importInbound(db,'mail','ticket')); assert.equal(db.writes.length,0);
});
