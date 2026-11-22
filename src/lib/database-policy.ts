export function useRemoteDatabase(env: Record<string, string | undefined>): boolean {
  if (!env.DATABASE_URL) return false;
  if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') return env.WS_USE_REMOTE_DATABASE === '1';
  return true; // Explicit maintenance and migration scripts.
}
