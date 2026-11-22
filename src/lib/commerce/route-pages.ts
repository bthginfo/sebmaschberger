import type { CommerceProduct, PageContent, Section, SiteLanguage, WebsiteContent } from '../types';
import type { ProductGroup } from './pricing';
import { hasBilingualHomepage, languageForSlug, localeForSlug } from '../site-languages';
import { defaultDesign } from '../section-library';
import { applyRouteTemplate } from '../route-templates';
import { routeTemplateKeyForPath, SHOP_SEARCH_SLUG, SHOP_SEARCH_EN_SLUG, type RouteTemplateKey } from '../route-template-keys';

export const productSlug = (product: Pick<CommerceProduct, 'slug'>, language: SiteLanguage = 'de') =>
  (language === 'en' ? 'en/shop/product/' : 'shop/produkt/') + product.slug;
export function categorySlug(group: Pick<ProductGroup, 'id'>, language: SiteLanguage = 'de'): string {
  const segment = /^[a-z0-9-]+$/.test(group.id) ? group.id
    : '~' + Array.from(new TextEncoder().encode(group.id), byte => byte.toString(16).padStart(2, '0')).join('');
  return (language === 'en' ? 'en/shop/category/' : 'shop/kategorie/') + segment;
}
export const shopSearchPath = '/' + SHOP_SEARCH_SLUG;
export const shopSearchPathEn = '/' + SHOP_SEARCH_EN_SLUG;
export function productCopy(product: CommerceProduct, language: SiteLanguage) {
  return {
    title: (language === 'en' && product.titleEn?.trim()) || product.title,
    description: (language === 'en' && product.descriptionEn?.trim()) || product.description,
  };
}

export function alternateShopPage(page: PageContent, content: WebsiteContent) {
  const key = routeTemplateKeyForPath(page.slug);
  if (!key?.startsWith('shop-') || !hasBilingualHomepage(content.pages)) return undefined;
  const parts = page.slug.split('/');
  const english = languageForSlug(page.slug) === 'en';
  const id = parts.at(-1);
  const alternate = key === 'shop-search' ? (english ? SHOP_SEARCH_SLUG : SHOP_SEARCH_EN_SLUG)
    : key === 'shop-product' ? productSlug({slug: id!}, english ? 'de' : 'en')
    : (english ? 'shop/kategorie/' : 'en/shop/category/') + id;
  return resolveShopPage(content, alternate);
}

const normalized = (value: string) => value.toLocaleLowerCase('de-DE').normalize('NFKD').replace(/\p{M}/gu, '');
export function matchingProducts(products: CommerceProduct[], search: string): CommerceProduct[] {
  const terms = normalized(search).trim().split(/\s+/).filter(Boolean).slice(0, 12);
  return products.filter(product => product.active && terms.every(term =>
    normalized([product.title, product.description, product.titleEn || '', product.descriptionEn || '', ...(product.variants || [])].join(' ')).includes(term)));
}

export function resolveShopPage(content: WebsiteContent, slug: string, search = '', preview = false): PageContent | undefined {
  const key = routeTemplateKeyForPath(slug);
  const shop = content.config.modules?.commerce;
  if (!shop || (!shop.enabled && !preview) || !key?.startsWith('shop-')) return undefined;

  const language = languageForSlug(slug);
  const active = shop.products.filter(product => product.active);
  const query = search.trim().slice(0, 150);
  let title: string;
  let description: string;
  let selected: CommerceProduct[];
  let image: string | undefined;
  let translationKey: string = key;
  let noindex = key === 'shop-search';

  if (key === 'shop-product') {
    const product = active.find(item => productSlug(item, language) === slug);
    if (!product) return undefined;
    ({title, description} = productCopy(product, language));
    translationKey += ':' + product.id;
    noindex = product.sample === true;
    selected = [product];
    image = product.image?.src;
  } else if (key === 'shop-category') {
    const group = shop.productGroups?.find(item => categorySlug(item, language) === slug);
    if (!group) return undefined;
    title = group.name;
    description = group.description || '';
    selected = active.filter(product => product.groupId === group.id);
    slug = categorySlug(group, language);
    translationKey += ':' + group.id;
  } else {
    title = language === 'en' ? 'Search products' : 'Produkte suchen';
    selected = query ? matchingProducts(active, query) : [];
    description = query ? language === 'en' ? `${selected.length} ${selected.length === 1 ? 'product' : 'products'} for “${query}”.` : selectedCount(selected.length) + ' für „' + query + '“.' : '';
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
    id: slug, slug, title, locale: localeForSlug(slug), translationKey, sections: [body],
    seo: { title: title + ' | ' + content.config.name, description: description.slice(0, 320), image, noindex }
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
  const languages: SiteLanguage[] = hasBilingualHomepage(content.pages) ? ['de','en'] : ['de'];
  const products = shop.products.filter(product => product.active);
  const groups = (shop.productGroups || []).filter(group => products.some(product => product.groupId === group.id));
  return languages.flatMap(language => [
    ...products.map(product => productSlug(product, language)),
    ...groups.map(group => categorySlug(group, language))
  ]).flatMap(slug => {
    const page = resolveShopPage(content, slug);
    return page ? [page] : [];
  });
}
