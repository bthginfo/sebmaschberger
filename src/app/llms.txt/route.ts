import {canonicalUrl,publishedContent,pageUrl} from '@/lib/content';
import {publicPages} from '@/lib/blog';
import {hasBilingualHomepage,languageForSlug,localizedSite} from '@/lib/site-languages';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [site, base] = await Promise.all([publishedContent(), canonicalUrl()]);
  const bilingual = hasBilingualHomepage(site.pages);
  const defaultLanguage = site.config.defaultWebsiteLanguage === 'en' && bilingual ? 'en' : 'de';
  const config = localizedSite(site.config, defaultLanguage);
  const pages = publicPages(site).filter(page => !page.seo.noindex);
  const home = pages.find(page => page.slug === (defaultLanguage === 'en' ? 'en' : ''));
  const languages = bilingual ? ['de', 'en'] as const : [defaultLanguage];
  const directory = languages.map(language => {
    const heading = language === 'en' ? 'Content in English' : 'Inhalte auf Deutsch';
    const links = pages.filter(page => languageForSlug(page.slug) === language)
      .map(page => `- [${page.title}](${pageUrl(base, page.slug, bilingual)}): ${page.seo.description}`);
    return [`## ${heading}`, '', ...links].join('\n');
  });
  const body = [`# ${config.name}`, home?.seo.description && `> ${home.seo.description}`, ...directory].filter(Boolean).join('\n\n');
  return new Response(body + '\n', {headers: {'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff'}});
}
