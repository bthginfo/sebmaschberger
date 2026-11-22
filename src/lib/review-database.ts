import { BlobPreconditionFailedError, get, put } from '@vercel/blob';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { CmsState } from '@/lib/types';

export interface ReviewStore {
  state: CmsState;
  records: Record<string, unknown>;
}

const pathname = 'workspace/site.sqlite';
const access = 'private' as const;

async function withDatabaseFile<T>(operation: (filename: string) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(path.join(tmpdir(), 'website-sqlite-'));
  try {
    return await operation(path.join(directory, 'site.sqlite'));
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}

export async function loadReviewDatabase(): Promise<{ store: ReviewStore; etag: string } | null> {
  const blob = await get(pathname, { access, useCache: false });
  if (!blob) return null;
  if (blob.statusCode !== 200 || !blob.blob.etag) throw new Error('Database snapshot could not be read.');
  const bytes = Buffer.from(await new Response(blob.stream).arrayBuffer());
  const store = await withDatabaseFile(async filename => {
    await writeFile(filename, bytes, { mode: 0o600 });
    const database = new DatabaseSync(filename, { readOnly: true });
    try {
      const state = database.prepare('SELECT data FROM site WHERE id = ?').get('main');
      if (typeof state?.data !== 'string') throw new Error('Database state is missing.');
      const rows = database.prepare('SELECT id, data FROM records').all();
      return {
        state: JSON.parse(state.data) as CmsState,
        records: Object.fromEntries(rows.map(row => [String(row.id), JSON.parse(String(row.data))])),
      };
    } finally {
      database.close();
    }
  });
  return { store, etag: blob.blob.etag };
}

async function writeDatabase(store: ReviewStore, etag?: string) {
  const bytes = await withDatabaseFile(async filename => {
    const database = new DatabaseSync(filename);
    try {
      database.exec('CREATE TABLE site (id TEXT PRIMARY KEY, data TEXT NOT NULL); CREATE TABLE records (id TEXT PRIMARY KEY, data TEXT NOT NULL); BEGIN');
      database.prepare('INSERT INTO site (id, data) VALUES (?, ?)').run('main', JSON.stringify(store.state));
      const insert = database.prepare('INSERT INTO records (id, data) VALUES (?, ?)');
      for (const [id, data] of Object.entries(store.records)) insert.run(id, JSON.stringify(data));
      database.exec('COMMIT');
    } finally {
      database.close();
    }
    return readFile(filename);
  });
  await put(pathname, bytes, {
    access,
    addRandomSuffix: false,
    contentType: 'application/vnd.sqlite3',
    ...(etag ? { ifMatch: etag } : {}),
  });
}

export async function seedReviewDatabase(store: ReviewStore) {
  if (await loadReviewDatabase()) return;
  try {
    await writeDatabase(store);
  } catch (error) {
    if (!(await loadReviewDatabase())) throw error;
  }
}

/** Repeat a pure update against a fresh snapshot when another writer commits first. */
export async function updateReviewDatabase<T>(update: (store: ReviewStore) => T | Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const snapshot = await loadReviewDatabase();
    if (!snapshot) throw new Error('The database must be set up before use.');
    const result = await update(snapshot.store);
    try {
      await writeDatabase(snapshot.store, snapshot.etag);
      return result;
    } catch (error) {
      if (!(error instanceof BlobPreconditionFailedError) || attempt === 5) throw error;
      await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 35));
    }
  }
  throw new Error('The database is busy.');
}
