import { Pool, type PoolClient } from 'pg';

type Request = { method?: string; headers: Record<string, string | string[] | undefined>; body?: { action?: string; args?: Record<string, unknown> } };
type Response = { status: (code: number) => Response; json: (body: unknown) => void; setHeader: (name: string, value: string) => void };
const url = process.env.HARKAS_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.HARKAS_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
let sourcePool: Pool | undefined, peerPool: Pool | undefined;
function pools() {
  if (!process.env.HARKAS_SUPABASE_DSN || !process.env.HARKAS_NEON_DSN || !url || !key) throw new Error('Offerte-database is nog niet geconfigureerd.');
  sourcePool ??= new Pool({ connectionString: process.env.HARKAS_SUPABASE_DSN, max: 3, connectionTimeoutMillis: 4000, idleTimeoutMillis: 5000 });
  peerPool ??= new Pool({ connectionString: process.env.HARKAS_NEON_DSN, max: 1, connectionTimeoutMillis: 4000, idleTimeoutMillis: 5000 });
  return { source: sourcePool, peer: peerPool };
}
const actions = new Set(['list', 'save_quote', 'set_quote_status', 'convert_quote_to_invoice']);

/** Same single-writer lease checks as ha-db.ts; never promote or bypass a fence. */
async function verifyAndRenewLease(db: PoolClient, peer: Pool) {
  const source = (await db.query('select role,epoch from public.harkas_resilience_state where singleton=true for update')).rows[0];
  const owner = (await db.query("select writer,epoch from public.harkas_failover_control where resource='harkas-admin-db' for update")).rows[0];
  const standby = (await peer.query('select role,epoch from public.harkas_resilience_state where singleton=true')).rows[0];
  const lease = (await db.query('select node,epoch from public.harkas_resilience_lease where singleton=true for update')).rows[0];
  if (!source || source.role !== 'primary' || !owner || owner.writer !== 'supabase' || Number(owner.epoch) !== Number(source.epoch)
    || !standby || standby.role !== 'standby' || Number(standby.epoch) !== Number(source.epoch)
    || !lease || lease.node !== 'supabase' || Number(lease.epoch) !== Number(source.epoch)) {
    throw new Error('HARKAS_WRITER_FENCED: database niet beschikbaar voor veilig schrijven.');
  }
  const result = await db.query("update public.harkas_resilience_lease set expires_at=now()+interval '10 minutes',renewed_at=now() where singleton=true and node='supabase' and epoch=$1", [source.epoch]);
  if (result.rowCount !== 1) throw new Error('HARKAS_WRITER_FENCED: schrijflease niet vernieuwd.');
}

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ error: 'Alleen POST toegestaan.' }); return; }
  const action = req.body?.action;
  if (!action || !actions.has(action) || Buffer.byteLength(JSON.stringify(req.body ?? {})) > 1000000) { res.status(400).json({ error: 'Ongeldig offerteverzoek.' }); return; }
  const authorization = String(req.headers.authorization || '');
  if (!authorization.startsWith('Bearer ')) { res.status(401).json({ error: 'Log opnieuw in.' }); return; }
  let db: PoolClient | undefined;
  try {
    const { source, peer } = pools();
    const auth = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key!, Authorization: authorization }, signal: AbortSignal.timeout(8000) });
    if (!auth.ok) { res.status(401).json({ error: 'Sessie ongeldig. Log opnieuw in.' }); return; }
    const user = await auth.json() as { id?: string };
    if (!user.id || !/^[0-9a-f-]{36}$/i.test(user.id)) { res.status(401).json({ error: 'Sessie ongeldig.' }); return; }
    db = await source.connect();
    await db.query('begin');
    await db.query("set local lock_timeout='3s'"); await db.query("set local statement_timeout='12s'");
    const permission = (await db.query("select public.has_module($1::uuid,'quotes') as allowed", [user.id])).rows[0];
    if (!permission?.allowed) { await db.query('rollback'); res.status(403).json({ error: 'Geen toegang tot Offertes.' }); return; }
    // Fail closed during failover until the standby baseline and replication are verified.
    const role = (await db.query('select role from public.harkas_resilience_state where singleton=true')).rows[0]?.role;
    if (role !== 'primary') throw new Error('HARKAS_WRITER_FENCED: Offertes is tijdelijk niet beschikbaar tijdens database-failover.');
    if (action === 'list') {
      // JSONB keeps NUMERIC values numeric in JavaScript, matching mutation RPCs.
      const result = await db.query('select to_jsonb(q) as data from public.quotes q order by created_at desc');
      await db.query('commit'); res.status(200).json({ data: result.rows.map(row => row.data) }); return;
    }
    await verifyAndRenewLease(db, peer);
    // Claims originate only from the verified Auth user, never from request arguments.
    await db.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)", [user.id, JSON.stringify({ sub: user.id, role: 'authenticated' })]);
    const args = req.body?.args ?? {};
    let result;
    if (action === 'save_quote') result = await db.query('select public.save_quote($1::jsonb) as data', [JSON.stringify(args.p_quote ?? null)]);
    else if (action === 'set_quote_status') result = await db.query('select public.set_quote_status($1::uuid,$2::integer,$3::text) as data', [args.p_id, args.p_version, args.p_status]);
    else result = await db.query('select public.convert_quote_to_invoice($1::uuid,$2::integer) as data', [args.p_id, args.p_version]);
    await db.query('commit'); res.status(200).json({ data: result.rows[0].data });
  } catch (err) {
    if (db) { try { await db.query('rollback'); } catch { /* connection is released below */ } }
    const e = err as { code?: string; message?: string };
    const validation = ['P0001','40001','42501'].includes(e.code || '');
    const fenced = e.message?.startsWith('HARKAS_WRITER_FENCED');
    const status = fenced ? 503 : e.code === '42501' ? 403 : e.code === '40001' ? 409 : validation || e.code?.startsWith('22') ? 400 : 503;
    res.status(status).json({ error: validation || fenced ? e.message : status === 400 ? 'Controleer de ingevoerde offertegegevens.' : 'Offerte-database tijdelijk niet bereikbaar. Je wijzigingen zijn niet bevestigd; vernieuw voordat je opnieuw probeert.' });
  } finally { db?.release(); }
}
