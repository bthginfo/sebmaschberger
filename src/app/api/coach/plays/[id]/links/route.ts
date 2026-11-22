import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { coachRoute } from '@/lib/coach/enabled';
import { rateLimit } from '@/lib/db';
import { ipKey, json, readJson, sameOrigin } from '@/lib/http';
import { createCoachLink, listCoachLinks, revokeCoachLink } from '@/lib/coach/store';
import { coachLinkSchema } from '@/lib/coach/validation';

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  return coachRoute(async () => {
    await requireAdmin();
    return json({ links: await listCoachLinks((await context.params).id) });
  })(request);
}

export async function POST(request: Request, context: Context) {
  return coachRoute(async req => {
    sameOrigin(req);
    await requireAdmin();
    await rateLimit(ipKey(req, 'coach-link'), 60, 3600);
    const { role, name, days } = coachLinkSchema.parse(await readJson(req, 4096));
    return json(await createCoachLink((await context.params).id, role, name, days), 201);
  })(request);
}

export async function DELETE(request: Request, context: Context) {
  return coachRoute(async req => {
    sameOrigin(req);
    await requireAdmin();
    const { id: linkId } = z.object({ id: z.string().uuid() }).parse(await readJson(req, 4096));
    await revokeCoachLink((await context.params).id, linkId);
    return json({ ok: true });
  })(request);
}
