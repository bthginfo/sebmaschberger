import { timingSafeEqual } from 'node:crypto';
import { digest } from '@/lib/security';
import { portalConfigured } from '@/lib/coaching-portal/store';
import { dailyDeviceSync } from '@/lib/coaching-portal/trackers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const actual = request.headers.get('authorization')?.replace(/^Bearer /u, '') ?? '';
  if (!expected || !timingSafeEqual(Buffer.from(digest(expected)), Buffer.from(digest(actual)))) {
    return Response.json({ error: 'Nicht autorisiert.' }, { status: 401 });
  }
  const count = portalConfigured() ? await dailyDeviceSync() : 0;
  return Response.json({ synced: count }, { headers: { 'Cache-Control': 'no-store' } });
}
