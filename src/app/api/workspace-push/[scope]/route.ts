import { getSession } from '@/lib/auth';
import { clubSession } from '@/lib/club/auth';
import { clubFeatures } from '@/lib/club/enabled';
import { AppError, rateLimit } from '@/lib/db';
import { handler, ipKey, json, readJson, sameOrigin } from '@/lib/http';
import { disconnectWorkspacePush } from '@/lib/workspace-push/devices';
import { pushStatus, testWorkspacePush, updatePushStatus, type PushIdentity } from '@/lib/workspace-push/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ scope: string }> };

async function identity(scope: string): Promise<PushIdentity> {
  if (scope === 'cms') {
    const session = await getSession();
    if (!session) throw new AppError('Sign in to the CMS first.', 401);
    const categories = session.role === 'owner' ? (await clubFeatures()).enabled ? ['messages', 'inquiries'] as const : ['inquiries'] as const : [];
    return { scope, accountId: session.accountId ?? 'cms-owner', categories: [...categories] };
  }
  if (scope === 'member') {
    const feature = await clubFeatures();
    if (!feature.enabled) throw new AppError('Not found.', 404);
    const actor = await clubSession();
    if (!actor) throw new AppError('Sign in to your club account.', 401);
    return { scope, accountId: actor.id, categories: feature.coachStudio ? ['messages', 'schedule', 'news', 'tactics'] : ['messages', 'schedule', 'news'] };
  }
  throw new AppError('Not found.', 404);
}

export function GET(request: Request, context: Context) {
  return handler(async req => {
    if (req.method !== 'GET') sameOrigin(req);
    const actor = await identity((await context.params).scope);
    if (req.method === 'GET') return json(await pushStatus(actor));
    if (req.method === 'PUT') {
      await rateLimit(ipKey(req, 'workspace-push-subscribe'), 30, 3600);
      return json(await updatePushStatus(actor, await readJson(req, 9_000)));
    }
    if (req.method === 'DELETE') {
      await disconnectWorkspacePush(actor.scope);
      return json(await pushStatus(actor, null));
    }
    if (req.method === 'POST') {
      await rateLimit(ipKey(req, 'workspace-push-test'), 5, 900);
      await testWorkspacePush(actor);
      return json({ ok: true });
    }
    throw new AppError('Not found.', 404);
  })(request);
}
export const PUT = GET;
export const DELETE = GET;
export const POST = GET;
