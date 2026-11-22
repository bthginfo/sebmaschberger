import { blogIndexPage, blogPostPage, hydrateBlogSections } from './blog';
import { categorySlug, productSlug, resolveShopPage } from './commerce/route-pages';
import { SHOP_SEARCH_SLUG, TEMPLATE_CONTENT_ID, TEMPLATE_INTRO_ID, type RouteTemplateKey } from './route-template-keys';
import { defaultBlog } from './site-config';
import { defaultDesign } from './section-library';
import type { BlogPost, CommerceProduct, PageContent, WebsiteContent } from './types';

const examplePost: BlogPost = {
  id: 'preview-post', slug: 'ein-blick-hinter-die-kulissen', title: 'Ein Blick hinter die Kulissen',
  excerpt: 'Wie aus einer ersten Idee etwas entsteht, das im Alltag funktioniert.',
  author: 'Unser Team', date: '2026-01-12', updatedAt: '', status: 'published',
  seo: { title: '', description: '' },
  sections: [{
    id: 'preview-post-body', type: 'richtext', name: 'Text', visible: true, design: { ...defaultDesign },
    content: { heading: 'Von der Idee zum ersten Entwurf', text: 'Am Anfang stehen gute Fragen. Danach prüfen wir gemeinsam, was funktioniert.' }
  }]
};

const exampleProduct: CommerceProduct = {
  id: 'preview-product', slug: 'workshop-gutschein', title: 'Workshop-Gutschein',
  description: 'Ein Gutschein für einen zweistündigen Workshop. Den Termin vereinbaren wir gemeinsam.',
  kind: 'service', groupId: 'workshops', priceCents: 7900, active: true
};

export function routeTemplatePreview(content: WebsiteContent, layout: PageContent, value: string) {
  const key = layout.id as RouteTemplateKey;
  const source = { ...content, templates: { ...content.templates, [key]: { seo: layout.seo, sections: layout.sections } } };
  if (key === 'blog-index' || key === 'blog-post') {
    const posts = content.posts?.length ? content.posts : [examplePost];
    const site = { ...content.config, blog: { ...defaultBlog, ...content.config.blog, enabled: true } };
    const context = { ...source, config: site, posts };
    const post = posts.find(candidate => candidate.id === value) ?? posts[0];
    const options = key === 'blog-post' ? posts.map(record => ({ id: record.id, title: record.title || 'Beitrag ohne Titel' })) : [];
    const page = key === 'blog-index' ? blogIndexPage(context, true) : hydrateBlogSections(blogPostPage(post, context, true), context, true);
    const readOnlySectionIds = key === 'blog-post'
      ? page.sections.filter(section => section.id === TEMPLATE_INTRO_ID || section.id === TEMPLATE_CONTENT_ID || section.id.startsWith('template-preview-')).map(section => section.id)
      : [];
    return { page, site, options, readOnlySectionIds, sample: !content.posts?.length };
  }

  const commerce = content.config.modules?.commerce;
  const active = commerce?.products.filter(product => product.active) || [];
  const products = active.length ? active : [exampleProduct];
  const groups = commerce?.productGroups?.length && active.length ? commerce.productGroups
    : [{ id: 'workshops', name: 'Workshops', description: 'Gutscheine und persönliche Workshops.' }];
  const product = products.find(candidate => candidate.id === value) ?? products[0];
  const group = groups.find(candidate => candidate.id === value) ?? groups[0];
  const site = { ...content.config, modules: { ...content.config.modules, commerce: { currency: 'EUR' as const, shippingCents: 0, ...commerce, enabled: true, products, productGroups: groups } } };
  const path = key === 'shop-product' ? productSlug(product) : key === 'shop-category' ? categorySlug(group) : SHOP_SEARCH_SLUG;
  const options = key === 'shop-product' ? products.map(record => ({ id: record.id, title: record.title }))
    : key === 'shop-category' ? groups.map(record => ({ id: record.id, title: record.name })) : [];
  const page = resolveShopPage({ ...source, config: site }, path, key === 'shop-search' ? value : '', true) ?? layout;
  return { page: hydrateBlogSections(page, source, true), site, options, readOnlySectionIds: [TEMPLATE_CONTENT_ID], sample: !active.length };
}
