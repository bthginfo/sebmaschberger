import type { BlogConfig, PageContent, Section, SectionType, WebsiteContent } from './types';
import { defaultDesign } from './section-library';
import { defaultBlog } from './site-config';
import {
  ROUTE_TEMPLATE_KEYS, TEMPLATE_CONTENT_ID, TEMPLATE_INTRO_ID, TEMPLATE_LABELS, type RouteTemplateKey
} from './route-template-keys';

export type RouteTemplate = Pick<PageContent, 'seo' | 'sections'>;

export function blogFeedType(layout: BlogConfig['layout']): SectionType {
  if (layout === 'editorial') return 'blog-editorial';
  return layout === 'list' ? 'blog-list' : 'blog-cards';
}

function slot(id: string, type: SectionType, name: string, heading: string, text = ''): Section {
  return { id, type, name, visible: true, content: { heading, text }, design: { ...defaultDesign } };
}

export function defaultRouteTemplate(key: RouteTemplateKey, content: WebsiteContent): RouteTemplate {
  const blog = content.config.blog ?? defaultBlog;
  const seo = { title: '', description: '' };
  if (key === 'blog-index') {
    return { seo, sections: [slot(TEMPLATE_CONTENT_ID, blogFeedType(blog.layout), 'Beitragsübersicht', blog.title, blog.description)] };
  }
  if (key === 'blog-post') {
    return { seo, sections: [
      { ...slot(TEMPLATE_INTRO_ID, 'hero', 'Beitragskopf', ''), design: { ...defaultDesign, spacing: 'compact' } },
      slot(TEMPLATE_CONTENT_ID, 'richtext', 'Inhalt aus dem Beitrag', '')
    ] };
  }
  const heading = key === 'shop-product' ? 'Produkt' : key === 'shop-category' ? 'Produkte der Kategorie' : 'Produkte suchen';
  return { seo, sections: [slot(TEMPLATE_CONTENT_ID, 'creator-shop', heading, '')] };
}

export function templateEditorPages(content: WebsiteContent): PageContent[] {
  return ROUTE_TEMPLATE_KEYS.filter(key => !key.startsWith('shop-') || Boolean(content.config.modules?.commerce))
    .map(key => {
      const template = content.templates?.[key] ?? defaultRouteTemplate(key, content);
      return { ...template, id: key, title: TEMPLATE_LABELS[key], locale: 'de', slug: templateAddress(key, content) };
    });
}

function templateAddress(key: RouteTemplateKey, content: WebsiteContent) {
  const blog = content.config.blog?.slug || 'blog';
  const paths: Record<RouteTemplateKey, string> = {
    'blog-index': blog, 'blog-post': blog + '/beitrag',
    'shop-product': 'shop/produkt/produktname', 'shop-category': 'shop/kategorie/kategorie', 'shop-search': 'shop/suche'
  };
  return paths[key];
}

export function applyRouteTemplate(
  page: PageContent,
  layout: RouteTemplate | undefined,
  bindContent: (section: Section) => Section[],
  bindIntro?: (section: Section) => Section[],
  preview = false
): PageContent {
  if (!layout) return page;
  const token = (value: string, fallback: string) => value
    ? value.replaceAll('{{titel}}', page.title).replaceAll('{{beschreibung}}', page.seo.description)
    : fallback;
  const seo = {
    ...page.seo, title: token(layout.seo.title, page.seo.title),
    description: token(layout.seo.description, page.seo.description),
    image: layout.seo.image || page.seo.image,
    noindex: page.seo.noindex === true || layout.seo.noindex === true
  };
  const sections = layout.sections.length ? layout.sections.flatMap(section => {
    if (section.id === TEMPLATE_CONTENT_ID) return bindContent(section);
    if (section.id === TEMPLATE_INTRO_ID && bindIntro) return bindIntro(section);
    return [{ ...section, id: preview ? section.id : 'template-block-' + section.id }];
  }) : page.sections;
  return { ...page, seo, sections };
}
