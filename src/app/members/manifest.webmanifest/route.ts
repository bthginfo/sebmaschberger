import { publishedContent } from '@/lib/content';
import { manifestResponse } from '@/lib/workspace-push/manifest';
import { clubFeatures } from '@/lib/club/enabled';

export async function GET() {
  if (!(await clubFeatures()).enabled) return new Response(null, { status: 404 });
  const { config } = await publishedContent();
  return manifestResponse('member', config.name, config.defaultWebsiteLanguage === 'de' ? 'de' : 'en');
}
