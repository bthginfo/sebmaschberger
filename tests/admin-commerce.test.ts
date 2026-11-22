import test from 'node:test';
import assert from 'node:assert/strict';
import {commerceProductIssues,newCommerceProductSlug,prepareCommercePages,shippingAddressLines} from '../src/components/admin/commerce-admin-model';
import {commercePageRoutes,hideInactiveCommerceLinks} from '../src/lib/commerce/pages';
import type {CommerceProduct,WebsiteContent} from '../src/lib/types';
import seed from './fixtures/starter-content.json';
import {createSection} from '../src/lib/section-library';
import {publicPages,resolvePage} from '../src/lib/blog';
import projectContent from '../src/data/content.json';

const product=(id:string,slug:string):CommerceProduct=>({id,slug,title:'Becher',description:'',kind:'physical',priceCents:1500,active:false});
test('adding after a middle deletion keeps an independently saveable product address',()=>{const products=[product('a','produkt-1'),product('b','produkt-2'),product('c','produkt-3')];products.splice(1,1);const added=product('d',newCommerceProductSlug(products));assert.equal(added.slug,'produkt-2');assert.deepEqual(commerceProductIssues([...products,added]),{});});
test('product feedback names duplicate addresses, invalid cents, repeated variants and fractional stock',()=>{const first=product('a','becher'),second={...product('b','becher'),priceCents:49,variants:['S','S'],stock:1.5};const issues=commerceProductIssues([first,second]);assert(issues.a.slug);assert(issues.b.slug);assert(issues.b.priceCents);assert(issues.b.variants);assert(issues.b.stock);assert(commerceProductIssues([{...first,priceCents:100000000}]).a.priceCents);});
test('shipping display uses only readable address fields, never arbitrary provider JSON',()=>{assert.deepEqual(shippingAddressLines({name:'Testkunde',address:{line1:'Teststraße 1',postal_code:'85049',city:'Ingolstadt',country:'DE'},token:'private-provider-value'}),['Testkunde','Teststraße 1','85049 Ingolstadt','DE']);assert.deepEqual(shippingAddressLines(null),[]);});

function fixture(){const content=structuredClone(seed) as WebsiteContent;content.config.modules={creator:{enabled:true,surface:'profile',demoBasePath:'/demo/eigen'}};return content;}
test('shop preparation reuses existing catalog and cart pages without replacing any content',()=>{const content=fixture(),catalog=createSection('creator-shop'),cart=createSection('creator-shop');cart.content.caption='cart';const base=content.pages[0];content.pages.push({...base,id:'existing-catalog',slug:'sortiment',title:'Sortiment',sections:[catalog]},{...base,id:'existing-cart',slug:'meine-auswahl',title:'Auswahl',sections:[cart]});const before=structuredClone(content.pages);const result=prepareCommercePages(content);assert.deepEqual(result.pages,before);assert.equal(commercePageRoutes(result).cart?.href,'/meine-auswahl');assert(result.config.navigation.some(item=>item.href==='/sortiment'));assert(result.config.navigation.some(item=>item.href==='/meine-auswahl'));assert.deepEqual(content.pages,before);});
test('shop preparation respects occupied and blog slugs and never enables sales',()=>{const content=fixture(),base=content.pages[0];content.pages.push({...base,id:'unrelated-shop',slug:'shop',title:'Bestehende Seite',sections:[]},{...base,id:'unrelated-cart',slug:'warenkorb',title:'Andere Seite',sections:[]});content.config.blog={enabled:true,title:'Blog',description:'',slug:'shop-2',layout:'cards',showInNavigation:false,navLabel:'Blog'};const before=structuredClone(content.pages),result=prepareCommercePages(content);assert.deepEqual(result.pages.slice(0,before.length),before);assert.equal(commercePageRoutes(result).catalog?.href,'/shop-3');assert.equal(commercePageRoutes(result).cart?.href,'/warenkorb-2');assert.equal(result.config.modules?.commerce,undefined);assert(!result.config.navigation.some(item=>item.href==='/warenkorb'));});
test('repeating shop preparation is idempotent and ignores hidden cart sections',()=>{const content=fixture(),hidden=createSection('creator-shop');hidden.content.caption='cart';hidden.visible=false;content.pages.push({...content.pages[0],id:'hidden-cart',slug:'warenkorb',sections:[hidden]});assert.equal(commercePageRoutes(content).cart,undefined);const prepared=prepareCommercePages(content);assert.equal(commercePageRoutes(prepared).cart?.href,'/warenkorb-2');assert.equal(prepareCommercePages(prepared),prepared);});

test('a KMU shop can prepare its own pages without opting into the Creator identity',()=>{const content=fixture();delete content.config.modules!.creator;content.config.modules!.commerce={enabled:false,currency:'EUR',shippingCents:0,products:[]};const before=structuredClone(content.config.theme),result=prepareCommercePages(content);assert.equal(result.config.modules?.creator,undefined);assert.deepEqual(result.config.theme,before);assert.equal(result.config.modules?.commerce?.enabled,false);assert(commercePageRoutes(result).catalog);assert(commercePageRoutes(result).cart);});

test('pausing the bilingual shop hides both storefronts and carts without discarding CMS content', () => {
  const content = structuredClone(projectContent) as WebsiteContent;
  const shop = content.config.modules!.commerce!;
  shop.enabled = false;
  const paused = structuredClone(shop);
  const routes = content.pages.filter(page => page.translationKey === 'shop' || page.translationKey === 'cart');
  assert.equal(routes.length, 4);
  const hidden = hideInactiveCommerceLinks(content.config, content.pages);
  const links = [
    ...hidden.navigation, ...hidden.locales!.en!.navigation,
    ...hidden.footer!.columns.flatMap(column => column.links),
    ...hidden.locales!.en!.footer!.columns.flatMap(column => column.links),
  ];
  for (const page of routes) {
    assert.equal(resolvePage(content, page.slug), undefined);
    assert(!publicPages(content).some(entry => entry.slug === page.slug));
    assert(!links.some(link => link.href === '/' + page.slug));
  }
  assert(links.some(link => link.href === '/kontakt'));
  assert(links.some(link => link.href === '/en/contact'));
  assert.deepEqual(shop, paused);
  shop.enabled = true;
  assert.equal(hideInactiveCommerceLinks(content.config, content.pages), content.config);
  for (const page of routes) assert.equal(resolvePage(content, page.slug)?.id, page.id);
});
