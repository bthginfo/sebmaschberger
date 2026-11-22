import type { BlogPost, ContentItem, PageContent, Section, WebsiteContent } from './types';
import { defaultBlog } from './site-config';
import { defaultDesign } from './section-library';
import { applyRouteTemplate, blogFeedType } from './route-templates';
import { resolveShopPage, shopPublicPages } from './commerce/route-pages';
import { isCommerceDestination } from './commerce/pages';

export const BLOG_SECTION_TYPES = new Set(['blog-cards', 'blog-editorial', 'blog-list']);

function byline(post: BlogPost) {
  return [post.author, post.date ? new Date(post.date + 'T12:00:00').toLocaleDateString('de-DE') : '']
    .filter(Boolean).join(' · ');
}

export function blogPostItems(content: WebsiteContent, preview = false): ContentItem[] {
  const config = content.config.blog ?? defaultBlog;
  return [...(content.posts ?? [])].filter(post => post.status === 'published' || preview)
    .sort((a, b) => b.date.localeCompare(a.date)).map(post => ({
      id: post.id, title: post.title, text: post.excerpt, image: post.cover,
      href: '/' + config.slug + '/' + post.slug, meta: byline(post), label: 'Beitrag lesen'
    }));
}

export function hydrateBlogSections(page: PageContent, content: WebsiteContent, preview = false): PageContent {
  const config = content.config.blog ?? defaultBlog;
  let items: ContentItem[] | undefined;
  return {
    ...page,
    sections: page.sections.map(section => {
      if (!BLOG_SECTION_TYPES.has(section.type)) return section;
      items ??= blogPostItems(content, preview);
      const feed = section.content.blogFeed;
      return {
        ...section,
        visible: section.visible && (config.enabled || preview),
        content: {
          ...section.content,
          items: feed?.limit ? items.slice(0, feed.limit) : items,
          ...(feed?.archiveLink && page.slug !== config.slug
            ? { primaryLabel: section.content.primaryLabel || 'Alle Beiträge', primaryHref: '/' + config.slug }
            : {})
        }
      };
    })
  };
}

export function blogIndexPage(content: WebsiteContent, preview = false): PageContent {
  const config = content.config.blog ?? defaultBlog;
  const section: Section = {
    id: 'blog-feed', type: blogFeedType(config.layout), name: 'Blogbeiträge', visible: true,
    content: { heading: config.title, text: config.description },
    design: { ...defaultDesign }
  };
  const base: PageContent = {
    id: 'blog-index', slug: config.slug, title: config.title, locale: 'de',
    seo: { title: config.navLabel + ' | ' + content.config.name, description: config.description }, sections: [section]
  };
  const page = applyRouteTemplate(base, content.templates?.['blog-index'], slot => [
    { ...slot, id: preview ? slot.id : 'blog-feed', content: { ...slot.content, blogFeed: undefined } }
  ], undefined, preview);
  return hydrateBlogSections(page, content, preview);
}

export function blogPostPage(post: BlogPost, content: WebsiteContent, preview = false): PageContent {
  const config = content.config.blog ?? defaultBlog;
  const intro: Section = {
    id: 'blog-title-' + post.id, type: 'hero', name: 'Beitragsauftakt', visible: true,
    content: {
      heading: post.title, subheading: byline(post), text: post.excerpt, image: post.cover,
      primaryLabel: 'Alle Beiträge', primaryHref: '/' + config.slug
    },
    design: { ...defaultDesign, theme: post.cover ? 'dark' : 'light', spacing: 'compact', heroLayout: post.cover ? 'auto' : 'compact' }
  };
  const base: PageContent = {
    id: 'post-' + post.id, slug: config.slug + '/' + post.slug, title: post.title, locale: 'de',
    seo: { ...post.seo, title: post.seo.title || post.title + ' | ' + content.config.name, description: post.seo.description || post.excerpt },
    sections: [intro, ...post.sections]
  };
  return applyRouteTemplate(base, content.templates?.['blog-post'],
    slot => preview ? (post.sections.length ? post.sections.map((section, index) => ({
      ...section, id: index === 0 ? slot.id : 'template-preview-' + section.id
    })) : [{ ...slot, content: { heading: 'Inhalt aus dem Beitrag', text: 'Die Abschnitte des jeweiligen Beitrags erscheinen hier.' } }]) : post.sections,
    slot => [{
      ...slot, id: preview ? slot.id : intro.id,
      design: { ...slot.design, heroLayout: !post.cover && (!slot.design.heroLayout || slot.design.heroLayout === 'auto') ? 'compact' : slot.design.heroLayout },
      content: { ...slot.content, ...intro.content, primaryLabel: slot.content.primaryLabel ?? intro.content.primaryLabel }
    }], preview);
}

export function resolvePage(content: WebsiteContent, slug: string, search = ''): PageContent | undefined {
  const regular = content.pages.find(page => page.slug === slug);
  if (regular) return content.config.modules?.commerce?.enabled === false && isCommerceDestination(regular) ? undefined : hydrateBlogSections(regular, content);
  const config = content.config.blog ?? defaultBlog;
  if (config.enabled) {
    if (slug === config.slug) return blogIndexPage(content);
    const post = (content.posts ?? []).find(post => post.status === 'published' && slug === config.slug + '/' + post.slug);
    if (post) return hydrateBlogSections(blogPostPage(post, content), content);
  }
  const shopPage = resolveShopPage(content, slug, search);
  return shopPage && hydrateBlogSections(shopPage, content);
}

export function publicPages(content: WebsiteContent): PageContent[] {
  const blog = content.config.blog ?? defaultBlog;
  const pages = [
    ...content.pages.filter(page => content.config.modules?.commerce?.enabled !== false || !isCommerceDestination(page)),
    ...(blog.enabled ? [blogIndexPage({ ...content, posts: [] }), ...(content.posts ?? []).filter(post => post.status === 'published').map(post => blogPostPage(post, content))] : []),
    ...shopPublicPages(content)
  ];
  const seen = new Set<string>();
  return pages.filter(page => {
    if (seen.has(page.slug)) return false;
    seen.add(page.slug);
    return true;
  });
}
