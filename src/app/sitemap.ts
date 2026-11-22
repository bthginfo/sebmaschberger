import type {MetadataRoute} from 'next';
import {canonicalUrl,publishedContent,pageUrl} from '@/lib/content';
import {hasBilingualHomepage,languageUrls} from '@/lib/site-languages';
import {publicPages} from '@/lib/blog';
// Vercel may retain a static metadata response after CMS publication.
// Render this response per request; the published index and canonical URL stay cached.
export const dynamic='force-dynamic';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const [content,base]=await Promise.all([publishedContent(),canonicalUrl()]);
  const bilingual=hasBilingualHomepage(content.pages);
  return publicPages(content).filter(page=>!page.seo.noindex).map(page=>({
    url:pageUrl(base,page.slug,bilingual),
    alternates:{languages:languageUrls(page,content.pages,base,content.config.defaultWebsiteLanguage)},
    changeFrequency:'monthly',priority:page.slug&&page.slug!=='en'?0.7:1,
  }));
}
