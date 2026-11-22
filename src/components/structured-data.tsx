import { languageForSlug, publishedPagePath } from '@/lib/site-languages';
import { projectAuthor } from '@/lib/project-brand';
import type { BlogPost, PageContent, SiteConfig } from '@/lib/types';

export function StructuredData({ page, site, base, post, bilingual = false, about }: { page: PageContent; site: SiteConfig; base: string; post?: BlogPost; bilingual?: boolean; about?: PageContent }) {
  const url = base + publishedPagePath(page.slug, bilingual);
  const english = languageForSlug(page.slug) === 'en';
  const home = base + publishedPagePath(english ? 'en' : '', bilingual);
  const organization = base + '/#organization';
  const author = base + '/#sebastian-maschberger';
  const authoredPage = Boolean(page.translationKey);
  const guide = projectAuthor.guideKeys.has(page.translationKey ?? '');
  const authorUrl = about ? base + publishedPagePath(about.slug, bilingual) : base;
  const graph: unknown[] = [
    { '@type': 'Organization', '@id': organization, name: site.legalName || site.name, url: base, telephone: site.phone || undefined, email: site.email || undefined, address: site.address ? { '@type': 'PostalAddress', streetAddress: site.address, postalCode: site.postalCode, addressLocality: site.city } : undefined },
    { '@type': 'WebSite', '@id': base + '/#website', url: base, name: site.name, inLanguage: page.locale, publisher: { '@id': organization } },
    { '@type': 'WebPage', '@id': url + '#webpage', url, name: page.seo.title, description: page.seo.description, inLanguage: page.locale, isPartOf: { '@id': base + '/#website' }, about: { '@id': authoredPage ? author : organization }, ...(authoredPage ? { author: { '@id': author } } : {}), ...(page.translationKey === 'about' ? { mainEntity: { '@id': author } } : {}) },
  ];
  if (authoredPage) graph.push({
    '@type': 'Person', '@id': author, name: projectAuthor.name, url: authorUrl,
    jobTitle: projectAuthor.jobTitle[english ? 'en' : 'de'], sameAs: [projectAuthor.profile],
  });
  if (guide) graph.push({
    '@type': 'Article', '@id': url + '#article', mainEntityOfPage: { '@id': url + '#webpage' },
    headline: page.title, description: page.seo.description, author: { '@id': author },
    publisher: { '@id': organization }, image: page.seo.image ? new URL(page.seo.image, base).href : undefined, inLanguage: page.locale,
  });
  if (page.slug && page.slug !== 'en') graph.push({ '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: english ? 'Home' : 'Startseite', item: home }, { '@type': 'ListItem', position: 2, name: page.title, item: url }] });
  const faq = page.sections.filter(s => s.visible && s.type === 'faq').flatMap(s => s.content.items || []);
  if (faq.length) graph.push({ '@type': 'FAQPage', mainEntity: faq.map(i => ({ '@type': 'Question', name: i.title, acceptedAnswer: { '@type': 'Answer', text: i.text } })) });
  if (post) graph.push({ '@type': 'BlogPosting', '@id': url + '#article', mainEntityOfPage: { '@id': url + '#webpage' }, headline: post.title, description: post.excerpt, datePublished: post.date, dateModified: post.updatedAt, author: { '@type': post.author === site.name ? 'Organization' : 'Person', name: post.author }, publisher: { '@id': organization }, image: post.cover ? new URL(post.cover.src, base).href : undefined, inLanguage: page.locale });
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replaceAll('<', '\\u003c') }} />;
}
