export const ROUTE_TEMPLATE_KEYS = [
  'blog-index', 'blog-post', 'shop-product', 'shop-category', 'shop-search'
] as const;

export type RouteTemplateKey = typeof ROUTE_TEMPLATE_KEYS[number];

export const TEMPLATE_INTRO_ID = 'template-intro';
export const TEMPLATE_CONTENT_ID = 'template-content';
export const SHOP_SEARCH_SLUG = 'shop/suche';
export const SHOP_SEARCH_EN_SLUG = 'en/shop/search';

export const TEMPLATE_LABELS: Record<RouteTemplateKey, string> = {
  'blog-index': 'Blog · Alle Beiträge',
  'blog-post': 'Blog · Beitragsdetail',
  'shop-product': 'Shop · Produktdetail',
  'shop-category': 'Shop · Kategorie',
  'shop-search': 'Shop · Suchergebnisse'
};

export function routeTemplateKeyForPath(slug: string, blogSlug?: string): RouteTemplateKey | undefined {
  if (blogSlug && slug === blogSlug) return 'blog-index';
  if (blogSlug && slug.startsWith(blogSlug + '/') && !slug.slice(blogSlug.length + 1).includes('/')) return 'blog-post';
  if (slug === SHOP_SEARCH_SLUG || slug === SHOP_SEARCH_EN_SLUG) return 'shop-search';
  if (/^(?:shop\/produkt|en\/shop\/product)\/[^/]+$/.test(slug)) return 'shop-product';
  if (/^(?:shop\/kategorie|en\/shop\/category)\/[^/]+$/.test(slug)) return 'shop-category';
  return undefined;
}
