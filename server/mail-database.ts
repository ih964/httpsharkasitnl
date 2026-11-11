import type { PoolConfig } from 'pg';

/**
 * Mail requests are short-lived Vercel invocations. A Supavisor session on 5432
 * reserves one backend per connection, even between queries. On the shared
 * Supabase pooler use transaction mode (6543) instead, keeping the SAME host,
 * role, database, credentials and TLS settings. Never change the HA/backup DSN.
 * Mail uses unnamed queries and transaction-local advisory locks only.
 */
export function mailDatabaseOptions(connectionString: string | undefined): PoolConfig {
  if (!connectionString) throw new Error('Mail database is not configured');
  let endpoint: URL;
  try { endpoint = new URL(connectionString); }
  catch { throw new Error('Mail database configuration is invalid'); }
  if (!['postgres:', 'postgresql:'].includes(endpoint.protocol)) throw new Error('Mail database configuration is invalid');
  let resolved = connectionString;
  if (/^[a-z0-9-]+\.pooler\.supabase\.com$/i.test(endpoint.hostname) && (!endpoint.port || endpoint.port === '5432')) {
    endpoint.port = '6543';
    // pg-connection-string also accepts a port query parameter. Keep it consistent.
    if (endpoint.searchParams.has('port')) endpoint.searchParams.set('port', '6543');
    resolved = endpoint.toString();
  }
  return {
    connectionString: resolved,
    max: 2,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 1000,
    maxLifetimeSeconds: 60,
    allowExitOnIdle: true,
    application_name: 'harkas-one-mail',
  };
}

/** Codes only, never raw errors, credentials, SQL or message content. */
export function mailFailureCode(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  return typeof code === 'string' && /^[A-Z0-9_]{1,32}$/.test(code) ? code : 'MAIL_FAILURE';
}

export function isMailDatabaseBusy(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? error.code : undefined;
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  return code === '53300' || /EMAXCONNSESSION|MaxClientsInSessionMode|max client connections|max clients reached/i.test(message);
}
