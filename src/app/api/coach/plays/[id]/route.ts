import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { coachRoute } from '@/lib/coach/enabled';
import { rateLimit } from '@/lib/db';
import { ipKey, json, readJson, sameOrigin } from '@/lib/http';
import { CoachConflict, getAuthorizedCoachPlay, removeCoachPlay, saveCoachPlay } from '@/lib/coach/store';
import { coachPlaySchema, coachRevisionSchema } from '@/lib/coach/validation';

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  return coachRoute(async () => {
    const { id } = await context.params;
    return json({ record: await getAuthorizedCoachPlay(id) });
  })(request);
}

export async function PUT(request: Request, context: Context) {
  return coachRoute(async req => {
    sameOrigin(req);
    await rateLimit(ipKey(req, 'coach-save'), 180, 3600);
    const { id } = await context.params;
    const { play, revision } = z.object({ play: coachPlaySchema, revision: coachRevisionSchema })
      .parse(await readJson(req, 900_000));
    try {
      return json({ record: await saveCoachPlay(id, play, revision) });
    } catch (error) {
      if (error instanceof CoachConflict) return json({ error: 'conflict', record: error.record }, 409);
      throw error;
    }
  })(request);
}

export async function DELETE(request: Request, context: Context) {
  return coachRoute(async req => {
    sameOrigin(req);
    await requireAdmin();
    const { id } = await context.params;
    const { revision } = z.object({ revision: coachRevisionSchema }).parse(await readJson(req, 1024));
    try {
      await removeCoachPlay(id, revision);
      return json({ ok: true });
    } catch (error) {
      if (error instanceof CoachConflict) return json({ error: 'conflict', record: error.record }, 409);
      throw error;
    }
  })(request);
}
