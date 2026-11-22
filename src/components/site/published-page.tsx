import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/auth';
import { consentLegalLinks, consentScriptDefinitionKey, publicConsentScriptPage } from '@/lib/consent/model';
import { digest } from '@/lib/security';
import { analyticsPrivacy } from '@/lib/analytics/model';
import { resolvePage } from '@/lib/blog';
import { hasBilingualHomepage, languageForSlug, languageSwitchSlugs } from "@/lib/site-languages";
import { publishedContent, publicPageSnapshot } from '@/lib/content';
import { clubTimelineItems } from '@/lib/club/fixtures';
import { publicClubFixtures } from '@/lib/club/public-fixtures';
import { pageMetadata } from '@/lib/metadata';
import { createSection } from '@/lib/section-library';
import { analytics } from '@/lib/server/analytics/store';
import { newsletter } from '@/lib/server/newsletter/store';
import { StructuredData } from '@/components/structured-data';
import { PublicSiteView } from './public-site-view';

async function publishedRoute(path: string) {
  const indexRequest = publishedContent();
  const germanHomeAlias = path === 'de' && !(await indexRequest).pages.some(page => page.slug === 'de');
  const slug = germanHomeAlias ? '' : path;
  const [snapshot, index] = await Promise.all([publicPageSnapshot(slug), indexRequest]);
  return { ...snapshot, index, slug, germanHomeAlias };
}

export async function publishedPageMetadata(path: string) {
  const { content, siteUrl, index, slug } = await publishedRoute(path);
  const page = resolvePage(content, slug);
  return page ? pageMetadata(page, content, siteUrl, index.pages) : {};
}

export async function PublishedPage({ path, query }: { path: string; query?: string }) {
  const { content, siteUrl, cartHref, index, slug, germanHomeAlias } = await publishedRoute(path);
  const bilingual = hasBilingualHomepage(index.pages);
  if (germanHomeAlias && !bilingual) redirect('/');
  const page = resolvePage(content, slug, query);
  if (!page) notFound();
  const club = content.config.modules?.clubManagement;
  const hasFixtures = club?.enabled && page.sections.some(section => section.type === 'timeline' && section.visible && section.content.clubFixtures);
  const fixtures = hasFixtures ? await publicClubFixtures() : undefined;
  const language = languageForSlug(page.slug);
  const sections = page.sections.map(section => fixtures && section.type === 'timeline' && section.content.clubFixtures
    ? { ...section, content: { ...section.content, items: clubTimelineItems(fixtures, section.content.clubFixtures, language, Date.now(), club?.timeZone) } } : section);
  if (page.slug === 'datenschutz') {
    const disclosures = await Promise.all([analytics.publicConfig().then(analyticsPrivacy), newsletter.disclosure()]);
    for (const [index, anchor] of ['webstatistik', 'newsletter'].entries()) {
      const disclosure = disclosures[index];
      if (disclosure) sections.push({
        ...createSection('richtext'), id: anchor + '-privacy', anchor,
        content: { heading: disclosure.title, text: disclosure.paragraphs.join('\n\n') }
      });
    }
  }
  const post = content.posts?.find(post => page.id === 'post-' + post.id);
  const { scripts = [], ...banner } = content.config.consent;
  const tracking = publicConsentScriptPage(page);
  const enabled = tracking && banner.enabled ? scripts.filter(script => script.enabled) : [];
  // Page-context code runs with this document's origin. Keep it out of signed-in CMS sessions.
  const cmsSession = enabled.some(script => script.context === 'page') && (await cookies()).has(SESSION_COOKIE);
  const items = cmsSession ? enabled.filter(script => script.context === 'sandbox') : enabled;
  const consent = {
    tracking,
    legalLinks: consentLegalLinks(content.config, language, index.pages),
    scripts: items.length ? { items, generation: digest(consentScriptDefinitionKey(items)) } : undefined,
  };
  const site = { ...content.config, consent: banner };
  return <>
    <StructuredData page={page} site={content.config} base={siteUrl} post={post} bilingual={bilingual} />
    <PublicSiteView cartHref={cartHref} page={{...page,sections}} site={site} consent={consent} translations={languageSwitchSlugs(page, index.pages)} />
  </>;
}
