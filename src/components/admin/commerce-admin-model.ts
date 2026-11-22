import {COMMERCE_LIMITS} from '@/lib/commerce/contracts';
import type {CommerceProduct,PageContent,WebsiteContent} from '@/lib/types';
import {commercePageRoutes} from '@/lib/commerce/pages';
import {createSection} from '@/lib/section-library';

export function prepareCommercePages(content:WebsiteContent){
 if(!content.config.modules?.creator?.enabled&&!content.config.modules?.commerce)return content;
 const routes=commercePageRoutes(content),pages=[...content.pages];
 const reserved=new Set([...pages.map(page=>page.slug),...(content.config.blog?.enabled?[content.config.blog.slug]:[])]);
 const add=(mode:'catalog'|'cart',base:string,title:string)=>{
  let slug=base,number=2;while(reserved.has(slug))slug=`${base}-${number++}`;reserved.add(slug);
  const section=createSection('creator-shop');section.name=title;section.content={...section.content,heading:title,text:mode==='catalog'?'Entdecken Sie unser Sortiment.':'Prüfen Sie Ihre Auswahl vor dem Bezahlen.',caption:mode};
  const page:PageContent={id:crypto.randomUUID(),slug,title,locale:'de',seo:{title,description:mode==='catalog'?'Produkte und Preise unseres Shops.':'Ihre Produktauswahl im Warenkorb.'},sections:[section]};pages.push(page);
 };
 if(!routes.catalog)add('catalog','shop','Shop');
 if(!routes.cart)add('cart','warenkorb','Warenkorb');
 const next={...content,pages},nextRoutes=commercePageRoutes(next),navigation=[...content.config.navigation];
 for(const [label,route] of [['Shop',nextRoutes.catalog],['Warenkorb',nextRoutes.cart]] as const)if(route&&!navigation.some(item=>item.href===route.href))navigation.push({label,href:route.href});
 if(pages.length===content.pages.length&&navigation.length===content.config.navigation.length)return content;
 return{...next,config:{...content.config,navigation}};
}

export function newCommerceProductSlug(products:Pick<CommerceProduct,'slug'>[]){
 const used=new Set(products.map(product=>product.slug));let number=1;
 while(used.has(`produkt-${number}`))number++;
 return `produkt-${number}`;
}

export function commerceProductIssues(products:CommerceProduct[]){
 const issues:Record<string,Partial<Record<'title'|'slug'|'priceCents'|'variants'|'stock',string>>>={};
 for(const product of products){
  const fields:NonNullable<typeof issues[string]>={};
  if(!product.title.trim())fields.title='Bitte einen Produktnamen eingeben.';
  if(!/^[a-z0-9-]{1,200}$/.test(product.slug))fields.slug='Bitte Kleinbuchstaben, Zahlen und Bindestriche verwenden.';
  else if(products.some(other=>other.id!==product.id&&other.slug===product.slug))fields.slug='Diese Produktadresse wird bereits verwendet. Bitte eine andere wählen.';
  if(!Number.isInteger(product.priceCents)||product.priceCents<50||product.priceCents>COMMERCE_LIMITS.maxTotalCents)fields.priceCents='Bitte einen Preis zwischen 0,50 € und 999.999,99 € eingeben.';
  if(product.variants&&(product.variants.length>50||product.variants.some(value=>!value.trim()||value.length>100)||new Set(product.variants).size!==product.variants.length))fields.variants='Bis zu 50 unterschiedliche Varianten mit jeweils höchstens 100 Zeichen.';
  if(product.stock!==undefined&&(!Number.isInteger(product.stock)||product.stock<0||product.stock>1000000))fields.stock='Bitte eine ganze Stückzahl von 0 bis 1.000.000 eingeben oder das Feld leer lassen.';
  if(Object.keys(fields).length)issues[product.id]=fields;
 }
 return issues;
}

export function shippingAddressLines(value:unknown):string[]{
 if(!value||typeof value!=='object'||Array.isArray(value))return[];
 const details=value as Record<string,unknown>;
 const address=details.address&&typeof details.address==='object'&&!Array.isArray(details.address)?details.address as Record<string,unknown>:{};
 const text=(item:unknown)=>typeof item==='string'?item.trim():'';
 return[text(details.name),text(address.line1),text(address.line2),[text(address.postal_code),text(address.city)].filter(Boolean).join(' '),text(address.state),text(address.country)].filter(Boolean);
}
