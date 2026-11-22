"use client";

import {usePathname} from 'next/navigation';
import {useContext,useEffect,useId,useRef,useState,type CSSProperties} from 'react';
import type {CreatorSectionProps} from '@/lib/creator/types';
import type {CheckoutResult,CommerceInventory} from '@/lib/commerce/contracts';
import {ContentLink,EditableImage,EditableText,SiteInteractionContext} from '@/components/site/editable';
import {useSectionHeadingLevel} from '@/components/site/heading-level';
import {CheckoutAttemptLimitError,clearCheckoutAttempt,markCheckoutAttemptSubmitted,prepareCheckoutAttempt,readCheckoutAttempt,saveCheckoutAttempt,type CheckoutAttempt} from '@/lib/commerce/checkout-attempt';
import {buttonInk,defaultDocumentDesign} from '@/lib/business/design';
import {quoteCommerce,DELIVERY_COUNTRIES} from '@/lib/commerce/pricing';
import {categorySlug,productCopy,productSlug,shopSearchPath,shopSearchPathEn} from '@/lib/commerce/route-pages';
import {TEMPLATE_CONTENT_ID} from '@/lib/route-template-keys';
import {WITHDRAWAL_PATH,WITHDRAWAL_LABEL} from '@/lib/commerce/withdrawal';
import {creatorMoney,useCreatorCart} from './shop/cart-state';
import styles from './commerce.module.css';

export function CommerceStorefront({section,site,editable,onChange}:CreatorSectionProps){
  const location = usePathname();
  const english = location === '/en' || location?.startsWith('/en/');
  const t = (de: string, en: string) => english ? en : de;
  const language = english ? 'en' : 'de';
  const cartPath = english ? '/en/cart' : '/warenkorb';
  const catalogPath = english ? '/en/shop' : '/shop';
  const formatMoney = english
    ? (cents:number) => new Intl.NumberFormat('en-GB',{style:'currency',currency:'EUR'}).format(cents/100)
    : creatorMoney;
  const config=site.modules?.commerce;
  const {isolated}=useContext(SiteInteractionContext);
  const {state,ready,storageKey,add,quantity,reset}=useCreatorCart();
  const [country,setCountry]=useState(''),[group,setGroup]=useState('');
  const [variants,setVariants]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[added,setAdded]=useState('');
  const [inventory,setInventory]=useState<Pick<CommerceInventory,'productId'|'available'>[]|null>(null);
  const [attempt,setAttempt]=useState<CheckoutAttempt|null>(null),[terminal,setTerminal]=useState(false);
  const inFlight=useRef(false),quantityId=useId(),heading=useSectionHeadingLevel(section.id);
  useEffect(()=>{
    if(editable||isolated||!config?.enabled)return;
    try{setAttempt(readCheckoutAttempt(sessionStorage));}catch{}
    const controller=new AbortController();fetch('/api/commerce/catalog',{cache:'no-store',signal:controller.signal}).then(async response=>{if(response.ok)setInventory((await response.json()).inventory);}).catch(()=>{});
    return()=>controller.abort();
  },[editable,isolated,config?.enabled,site.name]);
  if(!config?.enabled)return editable?<p>Der Shop ist ausgeschaltet. Produkte und Einrichtung findest du unter „Shop“ im CMS.</p>:null;
  if(isolated)return <p>Dieses Beispiel verwendet ausschließlich den lokalen Demo-Warenkorb.</p>;
  const c=section.content,mode=c.caption||'catalog';
  const colors=defaultDocumentDesign(site.name.slice(0,100),site.theme.accent);
  if(mode==='confirmation')return <div className={styles.store} style={!site.modules?.creator?.enabled?{'--ws-accent':colors.accent,'--ws-ink':buttonInk(colors.accent)} as CSSProperties:undefined}><p>{editable?'Die echte Bestellbestätigung wird nach der Zahlungsprüfung automatisch unter /checkout/ergebnis angezeigt. Wähle für diesen Abschnitt Produktübersicht, einzelnes Produkt oder Warenkorb.':'Den aktuellen Bestellstatus findest du über deinen persönlichen Bestelllink.'}</p></div>;
  const active=config.products.filter(p=>p.active);
  const routeLayout=section.id==='shop-dynamic-content'||section.id===TEMPLATE_CONTENT_ID;
  const detail=routeLayout&&mode==='product';
  const search=mode==='search',category=mode==='category';
  const selectedIds=new Set(c.items?.map(item=>item.productId));
  const products=mode==='product'||search||category
    ? active.filter(product=>selectedIds.has(product.id))
    : active.filter(product=>!group||product.groupId===group);
  const groups=config.productGroups?.filter(entry=>active.some(product=>product.groupId===entry.id)) || [];
  const palette=section.design;
  const style={
    ...(!site.modules?.creator?.enabled?{'--ws-accent':colors.accent,'--ws-ink':buttonInk(colors.accent)}:{}),
    ...(routeLayout?{
      '--shop-bg':palette.background||(palette.theme==='dark'?'#14211f':palette.theme==='accent'?'var(--ws-accent)':palette.theme==='soft'?'var(--ws-palette-surface)':'var(--ws-palette-background)'),
      '--shop-fg':palette.textColor||(palette.theme==='dark'?'#f8f8f3':palette.theme==='accent'?buttonInk(colors.accent):'var(--ws-palette-text)'),
      '--shop-radius':palette.radius+'px',
      '--shop-width':palette.width==='normal'?'950px':palette.width==='full'?'100%':'1240px',
      '--shop-pad':palette.spacing==='compact'?'clamp(20px,4cqi,56px)':palette.spacing==='airy'?'clamp(48px,9cqi,120px)':'clamp(30px,6cqi,90px)',
      '--shop-scale':palette.fontScale,
      '--shop-title-font':palette.headingFont==='sans'?'var(--font-body)':'var(--font-display)',
      '--shop-align':palette.align==='center'?'center':'left',
      '--shop-columns':palette.columns,
      ...(palette.accentColor?{'--ws-accent':palette.accentColor,'--ws-ink':buttonInk(palette.accentColor)}:{})
    }:{})
  } as CSSProperties;
  const lines=state.lines.map(line=>({...line,product:active.find(p=>p.id===line.productId)})).filter(line=>line.product);
  const example = lines.find(line => line.product?.sample);
  const hasSample = Boolean(example);
  const previewPath = english ? '/en/checkout/preview' : '/checkout/vorschau';
  const previewHref = example
    ? previewPath + '?' + new URLSearchParams({product:example.product!.slug,quantity:String(example.quantity)})
    : previewPath;
  const physical=lines.some(line=>line.product!.kind==='physical'),countries=[...new Set((config.shippingZones||[]).filter(z=>z.active).flatMap(z=>z.countries))];
  const selectedCountry=physical&&config.shippingZones?.length?(countries.includes(country)?country:countries.length===1?countries[0]:undefined):undefined;
  let quote:ReturnType<typeof quoteCommerce>|null=null,quoteError='';if(state.lines.length)try{quote=quoteCommerce(config,state.lines,selectedCountry);}catch(e){quoteError=e instanceof Error?e.message:'Bitte den Warenkorb prüfen.';}
  const subtotal=quote?.subtotalCents??lines.reduce((sum,line)=>sum+line.quantity*line.product!.priceCents,0),shipping=quote?.shippingCents;
  const available=(id:string,capacity?:number)=>inventory?.find(p=>p.productId===id)?.available??(capacity===0?0:undefined);
  async function checkout(restart=false){
    if(editable||isolated||inFlight.current||!lines.length||!quote||hasSample)return;inFlight.current=true;setError('');setBusy(true);
    try{
      if(restart){clearCheckoutAttempt(sessionStorage);setTerminal(false);}
      const items=lines.map(({productId,quantity,variant})=>({productId,quantity,variant}));
      let current:CheckoutAttempt;
      try{current=markCheckoutAttemptSubmitted(sessionStorage,prepareCheckoutAttempt(sessionStorage,items,storageKey,undefined,selectedCountry));}catch(reason){if(reason instanceof CheckoutAttemptLimitError)throw reason;throw new Error('Dein Browser kann die angefangene Kasse nicht sicher speichern. Bitte erlaube den Website-Speicher und versuche es erneut.');}
      setAttempt(current);
      const response=await fetch('/api/commerce/checkout',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':current.key},body:JSON.stringify({items,country:selectedCountry,previousKey:current.previousKey,previousKeys:current.previousKeys})});
      const result=await response.json() as CheckoutResult&{error?:string;code?:string};
      if(!response.ok){if(result.code==='OUT_OF_STOCK')fetch('/api/commerce/catalog',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(r=>r&&setInventory(r.inventory)).catch(()=>{});throw new Error(result.error||'Die Kasse konnte nicht geöffnet werden. Bitte versuche dieselbe Kasse erneut.');}
      if(!result.statusUrl?.startsWith('/checkout/ergebnis?'))throw new Error('Der Bestellzugang konnte nicht geprüft werden. Bitte dieselbe Kasse erneut öffnen.');
      const saved={...current,orderId:result.orderId,statusUrl:result.statusUrl};saveCheckoutAttempt(sessionStorage,saved);setAttempt(saved);
      if(result.state==='terminal'){setTerminal(true);setError('Diese Kasse ist beendet. Du kannst die Bestellung prüfen oder ausdrücklich eine neue Kasse starten.');return;}
      if(result.state!=='open'){window.location.assign(result.statusUrl);return;}
      const url=new URL(result.url||'');if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com'||url.username||url.password||url.port)throw new Error('Die Checkout-Adresse konnte nicht geprüft werden. Bitte dieselbe Kasse erneut öffnen.');
      window.location.assign(url.href);
    }catch(reason){setError(reason instanceof Error?reason.message:'Die Kasse ist gerade nicht erreichbar. Bitte dieselbe Kasse erneut versuchen.');}
    finally{inFlight.current=false;setBusy(false);}
  }
  return <div className={styles.store + (routeLayout?' '+styles.route:'')} data-seb-store data-store-view={mode} style={style}>
    <div className={routeLayout?styles.routeInner:undefined}>
    <header className={styles.intro}>
      <EditableText as={heading} value={c.heading} editable={editable} onChange={value=>onChange?.({...section,content:{...c,heading:value}})}/>
      <EditableText value={c.text} editable={editable} onChange={value=>onChange?.({...section,content:{...c,text:value}})}/>
      {!editable && <ContentLink className={styles.storeLink} href={mode==='cart'?catalogPath:cartPath}>
        {mode==='cart'?t('Weiter stöbern','Continue browsing'):t('Warenkorb öffnen','Open cart')}
      </ContentLink>}
    </header>
    {mode!=='cart'&&mode!=='product'&&(active.length>0||editable)&&<form className={styles.search} action={english?shopSearchPathEn:shopSearchPath} role="search" onSubmit={editable?event=>event.preventDefault():undefined}>
      <label htmlFor={quantityId+'-search'}>{t('Produkte suchen','Search products')}</label>
      <div><input type="search" id={quantityId+'-search'} name="q" placeholder={t('Produktname oder Stichwort','Product name or keyword')} defaultValue={c.searchTerm||''} maxLength={150} disabled={editable}/>
      <button type="submit" disabled={editable}>{t('Suchen','Search')}</button></div>
    </form>}
    {mode!=='cart'&&groups.length>0&&<nav className={styles.categoryLinks} aria-label={t('Shop-Kategorien','Shop categories')}>{groups.map(item=>
      <ContentLink key={item.id} href={'/'+categorySlug(item,language)} editable={editable}>{item.name}</ContentLink>
    )}</nav>}
    {mode!=='cart'&&<>{mode==='catalog'&&config.productGroups?.length?<nav className={styles.groupFilters} aria-label={t('Produktgruppen','Product groups')}><button type="button" aria-pressed={!group} onClick={()=>setGroup('')}>{t('Alle Produkte','All products')}</button>{config.productGroups.map(g=><button type="button" key={g.id} aria-pressed={group===g.id} onClick={()=>setGroup(g.id)}>{g.name}</button>)}</nav>:null}{products.length?<div className={detail?styles.productDetail:styles.catalog}>{products.map(product=>{
      const copy=productCopy(product,language);
      const remaining=available(product.id,product.stock),soldOut=remaining===0;
      return <article className={styles.product} key={product.id}>
        <EditableImage image={product.image}/>
        <div>{!detail&&<h3><ContentLink href={'/'+productSlug(product,language)} editable={editable}>{copy.title}</ContentLink></h3>}<p className={styles.productKind}>{product.kind==='digital'?t('Digitaler Download','Digital download'):product.kind==='service'?t('Dienstleistung','Service'):t('Versandprodukt','Shipped product')}</p>{product.sample&&<p className={styles.sample}>{t('Beispielprodukt','Sample product')}</p>}<p>{copy.description}</p><strong>{formatMoney(product.priceCents)}</strong>
        {Boolean(product.variants?.length)&&<label>{t('Variante','Variant')}<select value={variants[product.id]||product.variants?.[0]} disabled={busy} onChange={event=>setVariants({...variants,[product.id]:event.target.value})}>{product.variants?.map(variant=><option key={variant}>{variant}</option>)}</select></label>}
        {remaining!==undefined&&remaining>0&&<p className={styles.stock}>{t('Verfügbar:', 'Available:')} {remaining}</p>}
        <button type="button" disabled={editable||!ready||busy||soldOut} onClick={()=>{add({productId:product.id,variant:variants[product.id]||product.variants?.[0],quantity:1});setAdded(t('Zum Warenkorb hinzugefügt: ','Added to your cart: ')+copy.title);}}>{soldOut?t('Zurzeit vergriffen','Out of stock'):t('In den Warenkorb','Add to cart')}</button></div>
      </article>;
    })}</div>:<p className={styles.notice}>{mode==='product'?(editable?'Wähle im Abschnitt ein aktives Produkt aus deinem Shop.':t('Dieses Produkt ist gerade nicht verfügbar.','This product is currently unavailable.')):search?(c.searchTerm?t('Keine passenden Produkte gefunden.','No matching products.'):t('Gib einen Suchbegriff ein, um Produkte zu finden.','Enter a search term to find products.')):t('Aktuell gibt es keine Artikel zur Direktbestellung.','There are currently no items for direct purchase.')}</p>}</>}
    {added&&<p className={styles.notice} role="status">{added}</p>}
    {(mode==='cart'||lines.length>0||Boolean(attempt))&&<aside className={styles.cart} aria-label={t('Warenkorb','Cart')}>
      {mode!=='cart'&&<h3>{t('Dein Warenkorb','Your cart')}</h3>}
      {!ready?<p role="status">{t('Warenkorb wird geladen …','Loading your cart…')}</p>:!lines.length?<p>{t('Dein Warenkorb ist leer.','Your cart is empty.')}</p>:<>
        <ul>{lines.map((line,index)=><li key={JSON.stringify([line.productId,line.variant])}><div><strong>{productCopy(line.product!,language).title}</strong>{line.variant&&<span>{line.variant}</span>}<span>{formatMoney(line.product!.priceCents)} {t('pro Stück','each')}</span></div><label htmlFor={quantityId+'-'+index}>{t('Menge','Quantity')}<input id={quantityId+'-'+index} type="number" min="0" max="20" inputMode="numeric" value={line.quantity} disabled={busy||editable} onChange={event=>quantity(line.productId,line.variant,Number(event.target.value))}/></label><strong>{formatMoney(line.product!.priceCents*line.quantity)}</strong><button className={styles.remove} type="button" disabled={busy||editable} onClick={()=>quantity(line.productId,line.variant,0)} aria-label={t('Entfernen: ','Remove: ')+line.product!.title}>{t('Entfernen','Remove')}</button></li>)}</ul>
        {physical&&countries.length>0&&<label>{t('Lieferland','Delivery country')}<select value={selectedCountry||''} disabled={busy} onChange={e=>setCountry(e.target.value)}><option value="">{t('Bitte auswählen','Select a country')}</option>{countries.map(c=><option key={c} value={c}>{DELIVERY_COUNTRIES[c]||c}</option>)}</select></label>}
        <dl><div><dt>{t('Zwischensumme','Subtotal')}</dt><dd>{formatMoney(subtotal)}</dd></div><div><dt>{t('Versand','Shipping')}</dt><dd>{shipping===undefined?t('Nach Länderauswahl','After selecting a country'):formatMoney(shipping)}</dd></div><div><dt>{t('Gesamt','Total')}</dt><dd>{quote?formatMoney(quote.totalCents):t('Noch offen','Pending')}</dd></div>{quote?.taxGroups?.map(t=><div key={t.rate}><dt>{english ? 'Included VAT' : 'Enthaltene USt.'} {t.rate.toLocaleString(english?'en-GB':'de-DE')} %</dt><dd>{formatMoney(t.taxCents)}</dd></div>)}</dl>
        {quoteError&&<p role="status" className={styles.notice}>{quoteError}</p>}{state.lines.some(l=>!active.some(p=>p.id===l.productId))&&<p className={styles.notice}>Ein Produkt ist nicht mehr erhältlich. Bitte den Warenkorb leeren und neu zusammenstellen.</p>}
        {hasSample ? <p className={styles.notice}>{t('Du kannst Beispielprodukte hier ausprobieren. Für diese Artikel ist die Kasse pausiert.','Try the sample products in your cart. Checkout is paused for these items.')}</p> : <>
        <p>{t('An der Kasse prüfen wir Bestand und Endsumme inklusive anfallender Steuern. Deine Zahlungsdaten gibst du bei Stripe Checkout ein.','Stock and the total including applicable tax are checked at checkout. Enter your payment details through Stripe Checkout.')}</p>
        <div className={styles.actions}><button type="button" disabled={busy||editable||!quote} onClick={()=>void checkout(terminal)}>{busy?t('Kasse wird geprüft …','Checking checkout…'):terminal?t('Neue Kasse starten','Start a new checkout'):t('Zur sicheren Kasse','Go to secure checkout')}</button><button type="button" disabled={busy||editable} onClick={reset}>{t('Warenkorb leeren','Clear cart')}</button></div>
        <p>{t('Du kannst eine angefangene Kasse später fortsetzen. Wenn du deinen Warenkorb änderst, beendet der Zahlungsanbieter zuerst die bisherige Sitzung.','Resume an interrupted checkout later. If you change your cart, the payment provider closes the previous session first.')}</p>
        </>}
        {hasSample&&<div className={styles.actions}><ContentLink className={styles.storeLink} href={previewHref} editable={editable}>{t('Kasse ausprobieren','Try the checkout preview')}</ContentLink><button type="button" disabled={busy||editable} onClick={reset}>{t('Warenkorb leeren','Clear cart')}</button></div>}
      </>}
      {attempt?.statusUrl&&<p><a href={attempt.statusUrl}>{t('Bestellung prüfen oder fortsetzen','Review or resume your order')}</a></p>}
      {error&&<p role="alert" className={styles.error}>{error}</p>}
    </aside>}
    {config.consumerSales&&<p><ContentLink href={WITHDRAWAL_PATH} editable={editable} className="ws-withdrawal-link">{WITHDRAWAL_LABEL}</ContentLink></p>}
    {c.secondaryLabel&&<ContentLink href={c.secondaryHref} editField="secondaryHref" editable={editable}>{c.secondaryLabel}</ContentLink>}
    </div>
  </div>;
}
