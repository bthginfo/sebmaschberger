import { serveBrandIcon } from '@/lib/workspace-push/branding';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: { params: Promise<{ asset: string }> }) {
  return serveBrandIcon(request, (await params).asset);
}
