import { requireAdmin } from '@/lib/auth';
import { AppError, rateLimit } from '@/lib/db';
import { handler, ipKey, json, sameOrigin } from '@/lib/http';
import { brandIconKinds, brandIconSummary, saveBrandIcon, type BrandIconKind } from '@/lib/workspace-push/branding';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ icon?: string[] }> };

export function GET(request: Request, context: Context) {
  return handler(async req => {
    if (req.method !== 'GET') sameOrigin(req);
    await requireAdmin();
    const { icon } = await context.params;
    if (req.method === 'GET' && !icon?.length) return json({ icons: await brandIconSummary() });
    if (icon?.length !== 1 || !brandIconKinds.some(kind => kind === icon[0])) throw new AppError('Not found.', 404);
    if (req.method !== 'PUT' && req.method !== 'DELETE') throw new AppError('Not found.', 404);
    await rateLimit(ipKey(req, 'workspace-branding'), 28, 3600);
    return json({ icons: await saveBrandIcon(icon[0] as BrandIconKind, req.method === 'PUT' ? req : undefined) });
  })(request);
}
export const PUT = GET;
export const DELETE = GET;
