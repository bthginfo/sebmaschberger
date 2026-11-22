import {canonicalUrl,publishedContent,pageUrl} from '@/lib/content';
import {publicPages} from '@/lib/blog';
import {hasBilingualHomepage,localizedSite} from '@/lib/site-languages';
export const revalidate=false;
export async function GET(){
  const [site,base]=await Promise.all([publishedContent(),canonicalUrl()]);
  const bilingual=hasBilingualHomepage(site.pages);
  const english=bilingual&&site.config.defaultWebsiteLanguage!=='de';
  const config=localizedSite(site.config,english?'en':'de');
  const entries=publicPages(site).filter(page=>!page.seo.noindex).map(page=>`- [${page.title}](${pageUrl(base,page.slug,bilingual)}): ${page.seo.description}`).join('\n');
  return new Response(`# ${config.legalName||config.name}\n\n${config.tagline}\n\n${config.address}, ${config.postalCode} ${config.city}\n${english?'Phone':'Telefon'}: ${config.phone}\n${english?'Email':'E-Mail'}: ${config.email}\n\n## ${english?'Content':'Inhalte'}\n\n${entries}\n`,{headers:{'Content-Type':'text/plain; charset=utf-8','X-Content-Type-Options':'nosniff'}});
}
