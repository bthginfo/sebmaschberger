import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { coachRoute } from '@/lib/coach/enabled';
import { rateLimit } from '@/lib/db';
import { ipKey, json, readJson, sameOrigin } from '@/lib/http';
import { createCoachPlay, listCoachPlays } from '@/lib/coach/store';
import { coachPlaySchema } from '@/lib/coach/validation';

export const GET = coachRoute(async () => {
  await requireAdmin();
  return json({ plays: await listCoachPlays() });
});

export const POST = coachRoute(async request => {
  sameOrigin(request);
  await requireAdmin();
  await rateLimit(ipKey(request, 'coach-create'), 50, 3600);
  const { play } = z.object({ play: coachPlaySchema }).parse(await readJson(request, 900_000));
  return json({ record: await createCoachPlay(play) }, 201);
});
