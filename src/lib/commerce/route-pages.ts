import type { CommerceProduct, PageContent, Section, WebsiteContent } from '../types';
import type { ProductGroup } from './pricing';
import { defaultDesign } from '../section-library';
import { applyRouteTemplate } from '../route-templates';
import { routeTemplateKeyForPath, SHOP_SEARCH_SLUG, type RouteTemplateKey } from '../route-template-keys';

export const productSlug = (product: Pick<CommerceProduct, 'slug'>) => 'shop/produkt/' + product.slug;
export function categorySlug(group: Pick<ProductGroup, 'id'>): string {
  const segment = /^[a-z0-9-]+$/.test(group.id) ? group.id
    : '~' + Array.from(new TextEncoder().encode(group.id), byte => byte.toString(16).padStart(2, '0')).join('');
  return 'shop/kategorie/' + segment;
}
export const shopSearchPath = '/' + SHOP_SEARCH_SLUG;

const normalized = (value: string) => value.toLocaleLowerCase('de-DE').normalize('NFKD').replace(/\p{M}/gu, '');
export function matchingProducts(products: CommerceProduct[], search: string): CommerceProduct[] {
  const terms = normalized(search).trim().split(/\s+/).filter(Boolean).slice(0, 12);
  return products.filter(product => product.active && terms.every(term =>
    normalized([product.title, product.description, ...(product.variants || [])].join(' ')).includes(term)));
}

export function resolveShopPage(content: WebsiteContent, slug: string, search = '', preview = false): PageContent | undefined {
  const key = routeTemplateKeyForPath(slug);
  const shop = content.config.modules?.commerce;
  if (!shop || (!shop.enabled && !preview) || !key?.startsWith('shop-')) return undefined;

  const active = shop.products.filter(product => product.active);
  const query = search.trim().slice(0, 150);
  let title: string;
  let description: string;
  let selected: CommerceProduct[];
  let image: string | undefined;

  if (key === 'shop-product') {
    const product = active.find(item => productSlug(item) === slug);
    if (!product) return undefined;
    title = product.title;
    description = product.description;
    selected = [product];
    image = product.image?.src;
  } else if (key === 'shop-category') {
    const group = shop.productGroups?.find(item => categorySlug(item) === slug);
    if (!group) return undefined;
    title = group.name;
    description = group.description || '';
    selected = active.filter(product => product.groupId === group.id);
    slug = categorySlug(group);
  } else {
    title = 'Produkte suchen';
    selected = query ? matchingProducts(active, query) : [];
    description = query ? selectedCount(selected.length) + ' für „' + query + '“.' : '';
  }

  const body: Section = {
    id: 'shop-dynamic-content', type: 'creator-shop', name: title, visible: true,
    content: {
      heading: title, text: key === 'shop-product' ? '' : description,
      caption: key === 'shop-product' ? 'product' : key === 'shop-category' ? 'category' : 'search',
      ...(key === 'shop-search' ? { searchTerm: query } : {}),
      items: selected.map(product => ({ id: product.id, title: product.title, text: '', productId: product.id }))
    },
    design: { ...defaultDesign }
  };
  const page: PageContent = {
    id: slug, slug, title, locale: 'de', sections: [body],
    seo: { title: title + ' | ' + content.config.name, description: description.slice(0, 320), image, noindex: key === 'shop-search' }
  };
  return applyRouteTemplate(page, content.templates?.[key as RouteTemplateKey], slot => [{
    ...slot, id: preview ? slot.id : body.id,
    content: { ...slot.content, ...body.content, text: [body.content.text, slot.content.text].filter(Boolean).join('\n\n') }
  }], undefined, preview);
}

function selectedCount(total: number) {
  return total === 1 ? '1 Produkt' : total + ' Produkte';
}

export function shopPublicPages(content: WebsiteContent): PageContent[] {
  const shop = content.config.modules?.commerce;
  if (!shop?.enabled) return [];
  return [
    ...shop.products.filter(product => product.active).map(productSlug),
    ...(shop.productGroups || []).filter(group => shop.products.some(product => product.active && product.groupId === group.id)).map(categorySlug)
  ].flatMap(slug => {
    const page = resolveShopPage(content, slug);
    return page ? [page] : [];
  });
}
