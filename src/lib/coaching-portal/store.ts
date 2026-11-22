import 'server-only';
import { neon } from '@neondatabase/serverless';
import { AppError, getRecord, setRecord, listRecords, deleteRecord, mutateRecord, databaseConfigured } from '@/lib/db';

const remote = process.env.PORTAL_DATABASE_URL && (process.env.NODE_ENV === 'production' || process.env.WS_USE_REMOTE_PORTAL === '1')
  ? neon(process.env.PORTAL_DATABASE_URL) : undefined;
let initialized: Promise<unknown> | undefined;
function ready() {
  if (!remote) return;
  initialized ??= remote`CREATE TABLE IF NOT EXISTS coaching_records (
    bucket text NOT NULL, id text NOT NULL, data jsonb NOT NULL, seq bigint NOT NULL DEFAULT 0,
    changed timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(bucket,id)
  )`.catch(error => { initialized = undefined; throw error; });
  return initialized;
}
export function portalConfigured() {
  return Boolean(remote || process.env.NODE_ENV !== 'production' ||
    (process.env.PORTAL_USE_PRIVATE_SITE_STORE === '1' && databaseConfigured()));
}
function localBucket(bucket: string) {
  if (!portalConfigured()) throw new AppError('Das Coaching-Portal wird gerade eingerichtet.', 503);
  return 'coaching-portal-' + bucket;
}
export async function read<T>(bucket: string, id: string): Promise<T | null> {
  if (!remote) return getRecord<T>(localBucket(bucket), id);
  await ready();
  const rows = await remote`SELECT data FROM coaching_records WHERE bucket=${bucket} AND id=${id}`;
  return (rows[0]?.data as T) ?? null;
}
export async function list<T>(bucket: string, limit = 300): Promise<T[]> {
  if (!remote) return (await listRecords<T>(localBucket(bucket))).slice(0, limit);
  await ready();
  const rows = await remote`SELECT data FROM coaching_records WHERE bucket=${bucket} ORDER BY changed DESC,id LIMIT ${limit}`;
  return rows.map(row => row.data as T);
}
export async function save<T>(bucket: string, id: string, data: T) {
  if (!remote) return setRecord(localBucket(bucket), id, data);
  await ready();
  await remote`INSERT INTO coaching_records(bucket,id,data) VALUES(${bucket},${id},${JSON.stringify(data)}::jsonb)
    ON CONFLICT(bucket,id) DO UPDATE SET data=EXCLUDED.data,seq=coaching_records.seq+1,changed=now()`;
}
export async function remove(bucket: string, id: string) {
  if (!remote) return deleteRecord(localBucket(bucket), id);
  await ready();
  await remote`DELETE FROM coaching_records WHERE bucket=${bucket} AND id=${id}`;
}
export async function change<T>(bucket: string, id: string, initial: T, update: (value: T) => T): Promise<T> {
  if (!remote) return mutateRecord(localBucket(bucket), id, initial, update);
  await ready();
  for (let attempt = 0; attempt < 8; attempt++) {
    const rows = await remote`SELECT data,seq FROM coaching_records WHERE bucket=${bucket} AND id=${id}`;
    const row = rows[0];
    const result = update(structuredClone((row?.data as T) ?? initial));
    const serialized = JSON.stringify(result);
    const changed = row
      ? await remote`UPDATE coaching_records SET data=${serialized}::jsonb,seq=seq+1,changed=now() WHERE bucket=${bucket} AND id=${id} AND seq=${row.seq} RETURNING data`
      : await remote`INSERT INTO coaching_records(bucket,id,data) VALUES(${bucket},${id},${serialized}::jsonb) ON CONFLICT DO NOTHING RETURNING data`;
    if (changed[0]) return changed[0].data as T;
  }
  throw new AppError("Der Stand hat sich geändert. Lade die Ansicht neu und versuche es erneut.", 409);
}
