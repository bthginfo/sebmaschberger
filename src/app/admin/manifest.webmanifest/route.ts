import { publishedContent } from '@/lib/content';
import { manifestResponse } from '@/lib/workspace-push/manifest';

export async function GET() {
  const { config } = await publishedContent();
  return manifestResponse('cms', config.name, config.defaultWebsiteLanguage === 'de' ? 'de' : 'en');
}
