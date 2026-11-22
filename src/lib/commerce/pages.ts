import type {PageContent,WebsiteContent} from '../types';

export interface CommercePageRoute {id:string;title:string;href:string}
/** Resolve existing published or draft page destinations without inventing fixed routes. */
export function commercePageRoutes(content:Pick<WebsiteContent,'pages'>){
 const find=(mode:'catalog'|'cart'):CommercePageRoute|undefined=>{
  const page=content.pages.find(page=>page.sections.some(section=>section.visible&&section.type==='creator-shop'&&(section.content.caption||'catalog')===mode));
  return page?{id:page.id,title:page.title,href:pageHref(page)}:undefined;
 };
 return{catalog:find('catalog'),cart:find('cart')};
}
const pageHref=(page:Pick<PageContent,'slug'>)=>page.slug?`/${page.slug}`:'/';
