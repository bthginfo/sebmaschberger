import type {PageContent,SiteConfig,WebsiteContent} from '../types';

export interface CommercePageRoute {id:string;title:string;href:string}
/** Resolve existing published or draft page destinations without inventing fixed routes. */
export function commercePageRoutes(content:Pick<WebsiteContent,'pages'>){
 const find=(mode:'catalog'|'cart'):CommercePageRoute|undefined=>{
  const page=content.pages.find(page=>page.sections.some(section=>section.visible&&section.type==='creator-shop'&&(section.content.caption||'catalog')===mode));
  return page?{id:page.id,title:page.title,href:pageHref(page)}:undefined;
 };
 return{catalog:find('catalog'),cart:find('cart')};
}
// The bilingual storefront and cart are named routes in the site editor.
export function isCommerceDestination(page: Pick<PageContent, 'translationKey'>) {
  return page.translationKey === 'shop' || page.translationKey === 'cart';
}

export function withCommerceVisibility(content: WebsiteContent, enabled: boolean): WebsiteContent {
  const { config } = content;
  const commerce = config.modules?.commerce;
  return commerce ? { ...content, config: { ...config, modules: { ...config.modules, commerce: { ...commerce, enabled } } } } : content;
}

export function hideInactiveCommerceLinks(config: SiteConfig, pages: readonly PageContent[]): SiteConfig {
  if (config.modules?.commerce?.enabled !== false) return config;
  const hidden = new Set(pages.filter(isCommerceDestination).map(pageHref));
  const keep = <T extends { href: string }>(links: T[]) => links.filter(link => !hidden.has(link.href.split(/[?#]/u, 1)[0]));
  const filterFooter = (footer: SiteConfig['footer']) => footer && {
    ...footer,
    columns: footer.columns.map(column => ({ ...column, links: keep(column.links) })),
  };
  const en = config.locales?.en;
  return {
    ...config,
    navigation: keep(config.navigation),
    ...(config.footer ? { footer: filterFooter(config.footer) } : {}),
    ...(en ? { locales: { ...config.locales, en: { ...en, navigation: keep(en.navigation), ...(en.footer ? { footer: filterFooter(en.footer) } : {}) } } } : {}),
  };
}

const pageHref=(page:Pick<PageContent,'slug'>)=>page.slug?`/${page.slug}`:'/';
