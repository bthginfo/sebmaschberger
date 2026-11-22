import {initialBusinessSettings,businessSettingsInput,storedBusinessSettings,type BusinessSettings} from '../business/settings';
import {defaultDocumentDesign,type DocumentDesign} from '../business/design';
import {orderBusinessDocument} from './document';
import {catalogRuleIssues} from './pricing';
import {expectedStripeMode,stripeKeyMode} from './stripe-mode';
import {outcomeProof} from '../server/analytics/outcome-proof';
import {createHash,randomUUID} from 'node:crypto';
import type {SiteConfig,SiteSettings,WebsiteContent} from '../types';
import {allocatedStock,applyPaymentEvent,CommerceError,emptyCommerceStore,normalizeCart,priceCart,reserveOrder,signAccess,validAccess,type CartLine,type CommerceOrder,type CommerceStore,type VerifiedPaymentEvent} from './model';
import {assetPath,privateCommerceUrl,validateDigitalBytes,type CommerceAsset} from './assets';
import {checkoutCartKey,commerceSiteOrigin,commerceStatusLabel,COMMERCE_LIMITS,type CheckoutResult,type CommerceAdminSnapshot,type CommerceConnectionStatus,type CommerceInventory,type PublicCommerceOrder} from './contracts';

type ProviderObject=Record<string,any>;
export interface CommerceDependencies {
  env:()=>Record<string,string|undefined>;now?:()=>number;uuid?:()=>string;
  getPublished:()=>Promise<WebsiteContent>;getDraftConfig:()=>Promise<SiteConfig>;getSettings:()=>Promise<SiteSettings>;
  getRecord:<T>(collection:string,id:string)=>Promise<T|null>;setRecord:(collection:string,id:string,data:unknown)=>Promise<void>;
  mutate:(update:(state:CommerceStore)=>CommerceStore)=>Promise<CommerceStore>;
  stripe:(path:string,body?:URLSearchParams,idempotencyKey?:string)=>Promise<ProviderObject>;
  putAsset:(pathname:string,bytes:Uint8Array,contentType:string,token:string)=>Promise<{url:string}>;
  getAsset:(url:string,token:string)=>Promise<{statusCode:number;stream:ReadableStream<Uint8Array>|null;blob:{url:string;pathname:string;contentType:string|null;size:number|null}}|null>;
  sendMail:(message:{to:string;brand:string;orderId:string;refunded:boolean;partialRefund?:boolean;refundedCents?:number;lines:string[];total:string;subtotal?:string;tax?:string;shipping?:string;receiptUrl:string})=>Promise<void>;
}
function activeInvoiceRulesMissing(config:SiteConfig['modules'] extends infer M ? NonNullable<NonNullable<SiteConfig['modules']>['commerce']>|undefined : never){return !config?.taxRules?.length||config.products.some(p=>p.active&&!p.taxRuleId);}
export function createCommerceService(d:CommerceDependencies){
  const now=d.now??Date.now,uuid=d.uuid??randomUUID;const env=()=>d.env();
  const store=()=>d.getRecord<CommerceStore>('commerce','state').then(s=>s??emptyCommerceStore());
  const mutate=d.mutate;
  const secret=()=>{const value=env().AUTH_SECRET;if(!value||value.length<32)throw new CommerceError('Der geschützte Bestellzugang ist noch nicht eingerichtet.',503,'ACCESS_UNCONFIGURED');return value;};
  const requestHash=(key:string)=>createHash('sha256').update(key).digest('hex');
  const digest=(cart:CartLine[],country?:string)=>createHash('sha256').update(checkoutCartKey(normalizeCart(cart),country)).digest('hex');
  const statusUrl=(order:CommerceOrder)=>'/checkout/ergebnis?order='+encodeURIComponent(order.id)+'&key='+signAccess('order:'+order.id,secret());
  const stateOf=(order:CommerceOrder)=>order.status==='pending'?'open' as const:order.status==='processing'?'processing' as const:['expired','failed'].includes(order.status)?'terminal' as const:'complete' as const;
  const result=(order:CommerceOrder,url?:string):CheckoutResult=>({state:stateOf(order),orderId:order.id,statusUrl:statusUrl(order),expiresAt:order.expiresAt,canRestart:['expired','failed'].includes(order.status),...(url?{url}:{})});
  async function getOrder(id:string){const order=(await store()).orders.find(o=>o.id===id);if(!order)throw new CommerceError('Die Bestellung wurde nicht gefunden.',404,'ORDER_MISSING');return order;}
  async function commerceConfig(){const content=await d.getPublished();const config=content.config.modules?.commerce;if(!config?.enabled)throw new CommerceError('Der Shop nimmt gerade keine neuen Bestellungen an.',404,'SALES_DISABLED');return {content,config};}
  async function requireStripeMode(order:CommerceOrder){
    const {siteUrl}=await d.getSettings();
    const mode=expectedStripeMode(env(),siteUrl);
    if(stripeKeyMode(env().STRIPE_SECRET_KEY)!==mode){
      throw new CommerceError('Der Stripe-Zugang passt nicht zur Zahlungsumgebung.',503,'CHECKOUT_UNCONFIGURED');
    }
    if(order.paymentMode&&order.paymentMode!==mode){
      throw new CommerceError('Diese Bestellung gehört zu einer anderen Zahlungsumgebung.',409,'PAYMENT_MODE_MISMATCH');
    }
    return mode;
  }
  function checkSession(order:CommerceOrder,session:ProviderObject){
    if(order.paymentMode&&typeof session.livemode==='boolean'&&session.livemode!==(order.paymentMode==='live')){
      throw new CommerceError('Die Zahlung gehört zu einer anderen Zahlungsumgebung.',409,'PAYMENT_MODE_MISMATCH');
    }
    if(typeof session.id!=='string'||!/^cs_[a-zA-Z0-9_]+$/.test(session.id)||order.stripeSessionId&&order.stripeSessionId!==session.id||session.client_reference_id!==order.id&&session.metadata?.orderId!==order.id||session.amount_total!==order.totalCents||String(session.currency).toUpperCase()!==order.currency)throw new CommerceError('Die Zahlungsbestätigung passt nicht zur Bestellung.',409,'PAYMENT_MISMATCH');
    if(session.payment_status==='paid'&&order.shippingCountry){const actual=session.collected_information?.shipping_details?.address?.country??session.shipping_details?.address?.country;if(actual!==order.shippingCountry)throw new CommerceError('Das bestätigte Lieferland passt nicht zur Bestellung.',409,'PAYMENT_MISMATCH');}
  }
  function checkoutUrl(value:unknown){if(typeof value!=='string')throw new CommerceError('Die Kasse ist gerade nicht erreichbar. Bitte versuche es mit derselben Bestellung erneut.',502,'PROVIDER_UNAVAILABLE');const url=new URL(value);if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com'||url.username||url.password||url.port)throw new CommerceError('Die Checkout-Adresse ist ungültig.',502,'PROVIDER_UNAVAILABLE');return url.href;}
  async function recordSession(order:CommerceOrder,session:ProviderObject){
    checkSession(order,session);
    await mutate(s=>({...s,orders:s.orders.map(o=>o.id===order.id?{...o,stripeSessionId:session.id,checkoutFirstAttempt:undefined,checkoutUrl:session.status==='open'?checkoutUrl(session.url):o.checkoutUrl,expiresAt:Number.isInteger(session.expires_at)?new Date(session.expires_at*1000).toISOString():o.expiresAt}:o)}));
  }
  async function reconcile(order:CommerceOrder){
    if(order.status!=='pending'&&order.status!=='processing')return order;
    if(!order.stripeSessionId)return order;
    await requireStripeMode(order);
    const session=await d.stripe('checkout/sessions/'+encodeURIComponent(order.stripeSessionId));checkSession(order,session);
    let type:VerifiedPaymentEvent['type']|undefined;
    if(session.status==='expired')type='expired';
    if(session.status==='complete')type=session.payment_status==='paid'||session.payment_status==='no_payment_required'&&order.totalCents===0?'paid':'processing';
    if(type)await applySession(order,session,type,'reconcile:'+session.id+':'+type);
    else if(session.status==='open')await recordSession(order,session);
    else throw new CommerceError('Der Zahlungsstatus konnte noch nicht bestätigt werden. Bitte erneut prüfen.',502,'PROVIDER_UNAVAILABLE');
    return getOrder(order.id);
  }
  async function applySession(order:CommerceOrder,object:ProviderObject,type:VerifiedPaymentEvent['type'],eventId:string){
    const email=typeof object.customer_details?.email==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(object.customer_details.email)?object.customer_details.email.slice(0,254):undefined;
    const detail=object.customer_details,address=detail?.address;const clean=(value:unknown,max=200)=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,max).trim():'';const billingName=clean(detail?.name),billingAddress=[clean(address?.line1),clean(address?.line2),[clean(address?.postal_code,20),clean(address?.city)].filter(Boolean).join(' '),clean(address?.country,2)].filter(Boolean).join('\n');const billing=billingName&&billingAddress?{name:billingName,address:billingAddress}:undefined;
    const verified:VerifiedPaymentEvent={id:eventId,type,orderId:order.id,sessionId:String(object.id),paymentIntent:typeof object.payment_intent==='string'?object.payment_intent:undefined,amountCents:object.amount_total,currency:object.currency,email,billing,shipping:object.collected_information?.shipping_details??object.shipping_details,grants:type==='paid'?order.items.filter(i=>i.kind==='digital').map(i=>({id:uuid(),productId:i.productId,expiresAt:new Date(now()+7*86400000).toISOString(),downloads:0})):undefined};
    await mutate(s=>applyPaymentEvent(s,verified,now()));await attemptOrderMail(order.id);
  }
  async function ensureSession(order:CommerceOrder){
    if(order.stripeSessionId)return reconcile(order);
    if(!order.checkoutRequest){if(Date.parse(order.expiresAt)<=now()){await mutate(s=>applyPaymentEvent(s,{id:'local-expired:'+order.id,type:'expired',orderId:order.id},now()));return getOrder(order.id);}throw new CommerceError('Diese ältere Kasse kann nicht sicher fortgesetzt werden. Bitte kontaktiere den Shop mit der Bestellnummer.',409,'RECONCILIATION_REQUIRED');}
    // Stripe retains idempotency results for at least 24 h. Never recreate an ambiguous older request.
    if(order.checkoutAttemptedAt&&now()-Date.parse(order.checkoutAttemptedAt)>=23*3600000)throw new CommerceError('Die ursprüngliche Zahlungsanfrage muss vom Shop geprüft werden. Bitte keine zweite Bestellung starten; verwende deine Bestellnummer.',409,'RECONCILIATION_REQUIRED');
    await requireStripeMode(order);
    const attempt=uuid(),attemptedAt=new Date(now()).toISOString();
    const state=await mutate(s=>({...s,orders:s.orders.map(o=>{
      if(o.id!==order.id||o.status!=='pending'||o.stripeSessionId)return o;
      return {...o,checkoutAttemptedAt:o.checkoutAttemptedAt??attemptedAt,checkoutFirstAttempt:o.checkoutAttemptedAt?undefined:attempt};
    })}));
    const current=state.orders.find(o=>o.id===order.id)!;
    if(current.status!=='pending')return current;
    if(current.stripeSessionId)return reconcile(current);
    let session:ProviderObject;
    try{
      session=await d.stripe('checkout/sessions',new URLSearchParams(order.checkoutRequest),'ws-checkout:'+order.id);
    }catch(error){
      if(!(error instanceof CommerceError)||error.code!=='CHECKOUT_PROVIDER_REJECTED'||current.checkoutFirstAttempt!==attempt)throw error;
      // An earlier uncertain or concurrent request might already have created a Session.
      const saved=await mutate(s=>({...s,orders:s.orders.map(o=>o.id===order.id&&o.status==='pending'&&!o.stripeSessionId&&o.checkoutFirstAttempt===attempt
        ?{...o,status:'failed',checkoutFailure:'provider-rejected',checkoutFirstAttempt:undefined}:o)}));
      const updated=saved.orders.find(o=>o.id===order.id)!;
      if(updated.status==='pending'&&!updated.stripeSessionId)throw error;
      return updated.status==='pending'?reconcile(updated):updated;
    }
    await recordSession(order,session);
    return session.status==='open'?getOrder(order.id):reconcile(await getOrder(order.id));
  }
  async function releaseAttempt(order:CommerceOrder){
    if(order.status==='pending')order=await ensureSession(order);
    if(order.status==='pending'&&order.stripeSessionId){
      try{const session=await d.stripe('checkout/sessions/'+encodeURIComponent(order.stripeSessionId)+'/expire',new URLSearchParams(),'ws-expire:'+order.id);checkSession(order,session);if(session.status!=='expired')throw new CommerceError('Die Kasse wurde noch nicht beendet.',409,'CHECKOUT_NOT_CANCELED');await applySession(order,session,'expired','expired-by-customer:'+session.id);}catch(error){const current=await reconcile(await getOrder(order.id));if(current.status==='pending')throw error;}
      order=await getOrder(order.id);
    }
    return order;
  }
  async function inventory(products:{id:string;stock?:number}[]):Promise<CommerceInventory[]> {
    const s=await store();return products.map(p=>{const allocated=allocatedStock(s,p.id,now());return {productId:p.id,capacity:p.stock,allocated,available:p.stock===undefined?undefined:Math.max(0,p.stock-allocated)};});
  }
  async function adminSnapshot():Promise<CommerceAdminSnapshot>{
    const [published,draft,settings,s]=await Promise.all([d.getPublished(),d.getDraftConfig(),d.getSettings(),store()]);
    const products=draft.modules?.commerce?.products??[];
    const assets=await Promise.all(products.filter(p=>p.kind==='digital').map(async p=>{const a=await d.getRecord<CommerceAsset>('commerce-assets',p.id);return a&&privateCommerceUrl(a.url)?{productId:p.id,status:'ready' as const,filename:a.filename,contentType:a.contentType,createdAt:a.createdAt,size:a.size}:{productId:p.id,status:'missing' as const};}));
    const config=published.config.modules?.commerce;const configuredBusiness=await d.getRecord<BusinessSettings>('business-documents','settings');const business=configuredBusiness?storedBusinessSettings(configuredBusiness):initialBusinessSettings(published.config,settings.emailTemplates);const taxIssues=config?catalogRuleIssues(config):[];if(business.invoiceEnabled&&activeInvoiceRulesMissing(config))taxIssues.push('Für Shop-Rechnungen benötigt jedes aktive Produkt eine ausdrücklich gewählte Steuerregel.');if(business.profile.taxMode==='small_business'&&config?.taxRules?.some(t=>t.rate!==0))taxIssues.push('Im Kleinunternehmerprofil bitte ausschließlich Steuerregeln mit 0 % verwenden.');const active=config?.products.filter(p=>p.active)??[];const e=env();const local=e.NODE_ENV!=='production';const origin=commerceSiteOrigin(settings.siteUrl,local);
    const expectedMode=expectedStripeMode(e,settings.siteUrl),configuredMode=stripeKeyMode(e.STRIPE_SECRET_KEY),modeMatches=expectedMode===configuredMode;
    const missingAssets=await Promise.all(active.filter(p=>p.kind==='digital').map(async p=>!privateCommerceUrl((await d.getRecord<CommerceAsset>('commerce-assets',p.id))?.url??'')));
    const checks:CommerceConnectionStatus['checks']=[
      {id:'sales',label:'Shop veröffentlicht',state:config?.enabled?'ready':'off',detail:config?.enabled?'Der veröffentlichte Shop kann neue Bestellungen annehmen.':'Produkte als Entwurf vorbereiten und den Shop anschließend veröffentlichen. Bestehende Bestellungen bleiben erreichbar.',required:true},
      {id:'gate',label:'Zahlungen freigegeben',state:e.COMMERCE_CHECKOUT_ENABLED==='1'?'ready':'off',detail:e.COMMERCE_CHECKOUT_ENABLED==='1'?'Der serverseitige Zahlungsschalter ist gesetzt.':'Nach erfolgreichem Testkauf die Zahlungen durch die Websitebetreuung freigeben lassen.',required:true},
      {id:'stripe',label:'Stripe-Zugang',state:modeMatches?'unverified':'missing',detail:modeMatches
        ?(expectedMode==='live'?'Ein Live-Schlüssel ist hinterlegt. Prüfen Sie die Zahlungsarten und den Webhook mit dem eigenen Händlerkonto.':'Die isolierte Testumgebung verwendet Stripe im Testmodus.')
        :(expectedMode==='live'?'Für den veröffentlichten Shop ist ein eigener Stripe-Live-Schlüssel erforderlich.':'Für diese Testumgebung ist ein Stripe-Testschlüssel erforderlich.'),required:true},
      {id:'webhook',label:'Zahlungsbestätigung',state:e.STRIPE_WEBHOOK_SECRET?'unverified':'missing',detail:e.STRIPE_WEBHOOK_SECRET?'Webhook-Geheimnis hinterlegt; Zustellung und richtige Ereignisse im eigenen Stripe-Testmodus prüfen.':'Die automatische Zahlungsbestätigung durch die Websitebetreuung mit dem eigenen Stripe-Konto verbinden lassen.',required:true},
      {id:'access',label:'Geschützter Bestellzugang',state:e.AUTH_SECRET&&e.AUTH_SECRET.length>=32?'ready':'missing',detail:'Ein starker serverseitiger Zugangsschlüssel schützt Bestell- und Downloadlinks.',required:true},
      {id:'domain',label:'Shop-Adresse',state:origin?'ready':'missing',detail:origin?'Eine gültige Website-Adresse ohne Unterpfad ist gespeichert.':'Unter Einstellungen eine eigene HTTPS-Adresse ohne Unterpfad, Suchparameter oder Zugangsdaten speichern.',required:true},
      {id:'catalog',label:'Produkte bereit',state:active.length?'ready':'missing',detail:active.length?active.length+' aktive Produkte veröffentlicht.':'Mindestens ein geprüftes Produkt aktivieren und veröffentlichen.',required:true},
      {id:'taxes',label:'Preis- und Steuerregeln',state:taxIssues.length?'missing':'ready',detail:taxIssues.length?taxIssues.join(' '):'Produktpreise und konfigurierte Steuerregeln sind vollständig. Die steuerliche Einordnung bestimmen Sie mit Ihrer Steuerberatung.',required:true},
      {id:'shipping',label:'Versandländer',state:!active.some(p=>p.kind==='physical')||(config?.shippingZones?.length?config.shippingZones.some(z=>z.active&&z.countries.length>0):shippingCountries().length)?'ready':'missing',detail:'Liefergebiete, Länder und Versandpreise verwalten Sie unter Shop → Versand.',required:active.some(p=>p.kind==='physical')},
      {id:'downloads',label:'Privater Dateispeicher',state:e.PRIVATE_COMMERCE_BLOB_READ_WRITE_TOKEN?'unverified':active.some(p=>p.kind==='digital')?'missing':'off',detail:e.PRIVATE_COMMERCE_BLOB_READ_WRITE_TOKEN?'Geschützter Speicher hinterlegt. Eine eigene Produktdatei hochladen und den berechtigten Download beim Testkauf prüfen.':'Für digitale Produkte einen eigenen privaten Dateispeicher verbinden lassen. Öffentliche Medien sind keine geschützten Produktdateien.',required:active.some(p=>p.kind==='digital')},
      {id:'assets',label:'Digitale Produktdateien',state:missingAssets.some(Boolean)?'missing':'ready',detail:missingAssets.some(Boolean)?'Für ein veröffentlichtes digitales Produkt fehlt eine geschützte Datei.':'Veröffentlichte digitale Produkte haben hinterlegte private Dateien. Dateiinhalte beim eigenen Testkauf prüfen.',required:active.some(p=>p.kind==='digital')},
      {id:'withdrawal',label:'Widerrufsbestätigung',state:config?.consumerSales?(settings.smtp.enabled&&settings.smtp.host&&settings.smtp.from?'unverified':'missing'):'off',detail:config?.consumerSales?'Die elektronische Widerrufsfunktion benötigt einen funktionierenden E-Mail-Versand. Bitte einen Testwiderruf bestätigen.':'Verkaufen Sie an Verbraucher, richten Sie die Widerrufsfunktion unter Einstellungen ein.',required:config?.consumerSales===true},
      {id:'email',label:'Bestellmails',state:settings.smtp.enabled&&settings.smtp.host&&settings.smtp.from?'unverified':'off',detail:settings.smtp.enabled?'SMTP ist gespeichert. Versand über Einstellungen testen; fehlgeschlagene Bestellmails lassen sich wiederholen.':'E-Mail-Versand unter Einstellungen einrichten. Bestellungen bleiben auch ohne Mail gespeichert.',required:false},
      {id:'paypal',label:'PayPal über Stripe',state:e.STRIPE_PAYPAL_ENABLED==='1'?'unverified':'off',detail:e.STRIPE_PAYPAL_ENABLED==='1'?'PayPal wird angefordert. Verfügbarkeit im eigenen Stripe-Händlerkonto und Sandboxkauf müssen noch geprüft sein.':'Optional: PayPal im eigenen Stripe-Konto aktivieren und durch die Websitebetreuung verbinden lassen.',required:false}
    ];
    const checkout=checks.filter(c=>c.required).every(c=>c.state==='ready'||c.state==='unverified');
    const connection:CommerceConnectionStatus={checkout,card:modeMatches,paypal:e.STRIPE_PAYPAL_ENABLED==='1',privateDownloads:!!e.PRIVATE_COMMERCE_BLOB_READ_WRITE_TOKEN,message:checkout?'Die technischen Angaben sind vorhanden. Das bestätigt keine Händlerfreigabe oder erfolgreiche Testzahlung.':'Neue Zahlungen bleiben gesperrt, bis die erforderlichen Angaben vollständig sind.',salesEnabled:config?.enabled===true,draftEnabled:draft.modules?.commerce?.enabled===true,mailReady:!!(settings.smtp.enabled&&settings.smtp.host&&settings.smtp.from),paypalStatus:e.STRIPE_PAYPAL_ENABLED==='1'?'unverified':'off',checks};
    return {orders:s.orders.map(({requestKey:_k,requestDigest:_d,checkoutUrl:_u,checkoutRequest:_r,checkoutFirstAttempt:_first,...o})=>({...o,refundedCents:o.refundedCents??(o.status==='refunded'?o.totalCents:0),refundStatus:o.refundStatus??(o.status==='refunded'?'full':'none')})) as CommerceOrder[],connection,assets,inventory:await inventory(products)};
  }
  function shippingCountries(){return [...new Set((env().COMMERCE_SHIPPING_COUNTRIES||'DE').split(',').map(c=>c.trim()).filter(c=>/^[A-Z]{2}$/.test(c)))];}
  async function createCheckout(cart:CartLine[],key:string,previousKey?:string,previousKeys:string[]=[],country?:string):Promise<CheckoutResult>{
    const ancestors=[...new Set([...(previousKey?[previousKey]:[]),...previousKeys])].filter(ancestor=>ancestor!==key);
    if(ancestors.length>COMMERCE_LIMITS.checkoutAncestors)throw new CommerceError('Zu viele unterbrochene Kassen. Bitte verwende den vorhandenen Bestelllink oder kontaktiere den Shop. Die bisherigen Kassen wurden beibehalten.',409,'ATTEMPT_CHAIN_LIMIT');
    if(ancestors.some(ancestor=>!/^[a-zA-Z0-9_-]{16,100}$/.test(ancestor)))throw new CommerceError('Ein früherer Bestellzugang konnte nicht geprüft werden.',400,'ATTEMPT_INVALID');
    const requestKey=requestHash(key),requestDigest=digest(cart,country);let order=(await store()).orders.find(o=>o.requestKey===requestKey);
    if(order){if(order.requestDigest!==requestDigest)throw new CommerceError('Diese angefangene Kasse gehört zu einem anderen Warenkorb.',409,'ATTEMPT_CART_MISMATCH');if(order.status==='pending')order=await ensureSession(order);else if(order.status==='processing')order=await reconcile(order);return result(order,order.status==='pending'?checkoutUrl(order.checkoutUrl):undefined);}
    const {config,content:published}=await commerceConfig();const setup=await adminSnapshot();if(!setup.connection.checkout)throw new CommerceError('Echte Zahlungen sind noch nicht vollständig eingerichtet. Es wurde keine neue Zahlung gestartet.',503,'CHECKOUT_UNCONFIGURED');
    secret();if(country&&!/^[A-Z]{2}$/.test(country))throw new CommerceError('Bitte ein gültiges Lieferland wählen.');const priced=priceCart(config,cart,country);const settings=await d.getSettings();const base=commerceSiteOrigin(settings.siteUrl,env().NODE_ENV!=='production');if(!base)throw new CommerceError('Die Shop-Adresse muss zuerst eingerichtet werden.',503,'CHECKOUT_UNCONFIGURED');
    const configured=await d.getRecord<BusinessSettings>('business-documents','settings'),businessSettings=configured?storedBusinessSettings(configured):initialBusinessSettings(published.config,settings.emailTemplates);
    if(businessSettings.invoiceEnabled&&(!config.taxRules?.length||priced.items.some(i=>i.taxRate===undefined)))throw new CommerceError('Vor Shop-Rechnungen bitte alle Steuerregeln ausdrücklich einrichten.',503,'TAX_UNCONFIGURED');
    if(businessSettings.profile.taxMode==='small_business'&&((priced.taxCents||0)>0))throw new CommerceError('Im Kleinunternehmerprofil müssen die gewählten Steuerregeln 0 % verwenden.',503,'TAX_UNCONFIGURED');
    const designId=createHash('sha256').update(JSON.stringify(businessSettings.design)).digest('hex');if(!await d.getRecord('business-designs',designId))await d.setRecord('business-designs',designId,businessSettings.design);
    const business={designId,profile:businessSettings.profile,invoiceEnabled:businessSettings.invoiceEnabled};
    // A newer submitted request might have failed before it created a record or
    // retired its predecessor. Retain and resolve every known ancestor, newest
    // first; a completed/processing payment stops replacement immediately.
    for(const ancestor of ancestors){const old=(await store()).orders.find(o=>o.requestKey===requestHash(ancestor));if(old){const released=await releaseAttempt(old);if(!['expired','failed'].includes(released.status))return result(released);}}
    const instant=now();const id=uuid();const access=signAccess('order:'+id,secret());
    // Omit expires_at: Stripe's 24-hour default keeps an identical retry valid after a network timeout.
    const form=new URLSearchParams({mode:'payment',client_reference_id:id,'metadata[orderId]':id,'payment_intent_data[metadata][orderId]':id,success_url:base+'/checkout/ergebnis?order='+id+'&key='+access,cancel_url:base+'/checkout/ergebnis?order='+id+'&key='+access+'&canceled=1','payment_method_types[0]':'card','billing_address_collection':'required'});
    if(env().STRIPE_PAYPAL_ENABLED==='1')form.set('payment_method_types[1]','paypal');
    priced.items.forEach((line,index)=>{const prefix='line_items['+index+']';form.set(prefix+'[price_data][currency]','eur');form.set(prefix+'[price_data][unit_amount]',String(line.unitPriceCents));form.set(prefix+'[price_data][product_data][name]',line.title+(line.variant?' - '+line.variant:''));form.set(prefix+'[quantity]',String(line.quantity));});
    if(priced.items.some(i=>i.kind==='physical')){const countries=config.shippingZones?.length?(country?[country]:[]):country?(shippingCountries().includes(country)?[country]:[]):shippingCountries();if(!countries.length)throw new CommerceError('Die Versandländer sind nicht eingerichtet.',503,'CHECKOUT_UNCONFIGURED');countries.forEach((country,index)=>form.set('shipping_address_collection[allowed_countries]['+index+']',country));form.set('shipping_options[0][shipping_rate_data][type]','fixed_amount');form.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]',String(priced.shippingCents));form.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]','eur');form.set('shipping_options[0][shipping_rate_data][display_name]','Versand');}
    const proposed:CommerceOrder={id,requestKey,requestDigest,createdAt:new Date(instant).toISOString(),expiresAt:new Date(instant+24*3600000).toISOString(),status:'pending',...priced,business,paymentMode:expectedStripeMode(env(),settings.siteUrl),checkoutRequest:form.toString(),fulfillment:'pending',mail:{status:'pending',kind:'paid',attempts:0},grants:[],refundedCents:0,refundStatus:'none'};
    const saved=await mutate(s=>reserveOrder(s,proposed,now()));order=saved.orders.find(o=>o.requestKey===requestKey)!;
    order=await ensureSession(order);return result(order,order.status==='pending'?checkoutUrl(order.checkoutUrl):undefined);
  }
  async function handleStripeEvent(event:{id:string;type:string;livemode:boolean;data:{object:ProviderObject}}){
    const {siteUrl}=await d.getSettings();
    if(event.livemode!==(expectedStripeMode(env(),siteUrl)==='live'))return;
    const object=event.data.object;let type:VerifiedPaymentEvent['type']|undefined;
    if((event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded')&&(object.payment_status==='paid'||object.payment_status==='no_payment_required'&&object.amount_total===0))type='paid';
    if(event.type==='checkout.session.completed'&&!type)type='processing';
    if(event.type==='checkout.session.expired')type='expired';if(event.type==='checkout.session.async_payment_failed')type='failed';if(event.type==='charge.refunded'&&Number(object.amount_refunded)>0)type='refunded';if(!type)return;
    let orderId=object.metadata?.orderId||object.client_reference_id;const paymentIntent=typeof object.payment_intent==='string'?object.payment_intent:undefined;
    if(!orderId&&paymentIntent){orderId=(await store()).orders.find(o=>o.stripePaymentIntent===paymentIntent)?.id;if(!orderId)orderId=(await d.stripe('payment_intents/'+encodeURIComponent(paymentIntent))).metadata?.orderId;}
    if(typeof orderId!=='string')return;
    const current=(await store()).orders.find(order=>order.id===orderId);
    if(!current||current.paymentMode&&event.livemode!==(current.paymentMode==='live'))return;
    if(type==='refunded'){if(object.amount!==current.totalCents||String(object.currency).toUpperCase()!==current.currency)throw new CommerceError('Die Erstattung passt nicht zur Bestellung.',409,'PAYMENT_MISMATCH');await mutate(s=>applyPaymentEvent(s,{id:event.id,type,orderId,paymentIntent,refundedCents:object.amount_refunded,currency:object.currency},now()));await attemptOrderMail(orderId);}
    else {checkSession(current,object);await applySession(current,object,type,event.id);}
  }
  async function attemptOrderMail(id:string){
    const settings=await d.getSettings(),leaseId=uuid(),leaseUntil=new Date(now()+120000).toISOString();
    const claimed=await mutate(s=>({...s,orders:s.orders.map(o=>{if(o.id!==id||!['paid','refunded'].includes(o.status)||o.mail.status==='sent'||o.mail.status==='sending'&&Date.parse(o.mail.leaseUntil||'')>now())return o;if(!settings.smtp.enabled)return {...o,mail:{...o.mail,status:'not-configured'}};return {...o,mail:{...o.mail,status:'sending',attempts:o.mail.attempts+1,leaseId,leaseUntil}};})}));
    const selected=claimed.orders.find(o=>o.id===id&&o.mail.leaseId===leaseId);if(!selected)return;let status:'sent'|'failed'='failed';
    try{if(!selected.email)throw new Error('No recipient');const content=await d.getPublished();const base=commerceSiteOrigin(settings.siteUrl,env().NODE_ENV!=='production');if(!base)throw new Error('Invalid origin');await d.sendMail({to:selected.email,brand:content.config.name,orderId:selected.id,refunded:selected.status==='refunded',partialRefund:(selected.refundedCents??0)>0&&selected.status!=='refunded',refundedCents:selected.refundedCents,lines:selected.items.map(i=>i.quantity+' x '+i.title+(i.variant?' ('+i.variant+')':'')),total:(selected.totalCents/100).toLocaleString('de-DE',{style:'currency',currency:'EUR'}),subtotal:(selected.subtotalCents/100).toLocaleString('de-DE',{style:'currency',currency:'EUR'}),shipping:(selected.shippingCents/100).toLocaleString('de-DE',{style:'currency',currency:'EUR'}),tax:selected.taxCents===undefined?undefined:(selected.taxCents/100).toLocaleString('de-DE',{style:'currency',currency:'EUR'}),receiptUrl:base+statusUrl(selected)});status='sent';}catch{}
    await mutate(s=>({...s,orders:s.orders.map(o=>o.id===id&&o.mail.kind===selected.mail.kind&&o.mail.leaseId===leaseId?{...o,mail:{...o.mail,status,leaseUntil:undefined,leaseId:undefined}}:o)}));
  }
  async function listOrders(){return (await adminSnapshot()).orders;}
  async function fulfillOrder(id:string,tracking?:string){await getOrder(id);return mutate(s=>({...s,orders:s.orders.map(o=>{if(o.id!==id)return o;if(o.status!=='paid')throw new CommerceError('Nur bezahlte Bestellungen können ausgeliefert werden.',409);if(o.fulfillment==='fulfilled')return o;return {...o,fulfillment:'fulfilled',fulfilledAt:new Date(now()).toISOString(),tracking:tracking?.trim().slice(0,500)};})}));}
  async function publicOrder(id:string,key:string):Promise<PublicCommerceOrder>{
    if(!validAccess('order:'+id,key,secret()))throw new CommerceError('Dieser Bestellzugang ist ungültig. Bitte verwende den vollständigen Bestelllink.',403,'ORDER_ACCESS_INVALID');
    const order=await getOrder(id);const published=await d.getPublished();const shop=published.pages.find(p=>p.sections.some(s=>s.type==='creator-shop'&&s.visible));
    const downloads:PublicCommerceOrder['downloads']=order.status==='refunded'?order.items.filter(i=>i.kind==='digital').map((item,index)=>({id:'revoked-'+index,productId:item.productId,title:item.title,state:'revoked',expiresAt:order.expiresAt,remaining:0})):order.grants.map(g=>{const item=order.items.find(i=>i.productId===g.productId)!;const state=order.status!=='paid'?'revoked' as const:Date.parse(g.expiresAt)<=now()?'expired' as const:g.downloads>=20?'exhausted' as const:'ready' as const;const payload=Buffer.from(JSON.stringify({orderId:id,grantId:g.id})).toString('base64url');return {id:g.id,productId:g.productId,title:item?.title||'Digitales Produkt',state,expiresAt:g.expiresAt,remaining:Math.max(0,20-g.downloads),...(state==='ready'?{url:'/api/commerce/download/'+payload+'.'+signAccess('download:'+payload,secret())}:{})};});
    return {id:order.id,statisticsProof:order.status==='paid'&&order.paidAt?outcomeProof('purchase',order.id,order.paidAt,env().AUTH_SECRET,now()):undefined,documentUrl:['paid','refunded'].includes(order.status)?'/api/commerce/documents/'+encodeURIComponent(order.id)+'?key='+encodeURIComponent(key):undefined,status:order.status,statusLabel:commerceStatusLabel(order),subtotalCents:order.subtotalCents,shippingCents:order.shippingCents,totalCents:order.totalCents,currency:order.currency,netCents:order.netCents,taxCents:order.taxCents,refundedCents:order.refundedCents??(order.status==='refunded'?order.totalCents:0),refundStatus:order.refundStatus??(order.status==='refunded'?'full':'none'),fulfillment:order.fulfillment,fulfilledAt:order.fulfilledAt,tracking:order.tracking,items:order.items.map(({productId,title,quantity,variant,kind,unitPriceCents})=>({productId,title,quantity,variant,kind,unitPriceCents})),downloads,checkout:{state:stateOf(order),canResume:order.status==='pending',canRestart:['expired','failed'].includes(order.status)},shopUrl:shop?'/'+shop.slug:'/'};
  }
  async function orderAction(id:string,key:string,action:'refresh'|'resume'|'cancel'){
    await publicOrder(id,key);let order=await getOrder(id);
    if(action==='cancel')order=await releaseAttempt(order);else if(order.status==='pending')order=await ensureSession(order);else if(order.status==='processing')order=await reconcile(order);
    return {order:await publicOrder(id,key),checkout:result(order,action==='resume'&&order.status==='pending'?checkoutUrl(order.checkoutUrl):undefined)};
  }
  async function uploadDigitalAsset(productId:string,file:File){
    const draft=await d.getDraftConfig();if(!draft.modules?.commerce?.products.some(p=>p.id===productId&&p.kind==='digital'))throw new CommerceError('Bitte dieses digitale Produkt zuerst als Entwurf speichern.',409,'PRODUCT_DRAFT_REQUIRED');
    const token=env().PRIVATE_COMMERCE_BLOB_READ_WRITE_TOKEN;if(!token)throw new CommerceError('Der private Downloadspeicher ist noch nicht verbunden.',503,'ASSET_UNCONFIGURED');
    if(file.size>COMMERCE_LIMITS.maxFileBytes)throw new CommerceError('Bitte verwende eine Datei bis 4 MB.',413,'ASSET_SIZE');const bytes=new Uint8Array(await file.arrayBuffer());const contentType=validateDigitalBytes(bytes,file.type);
    const extension=({'application/zip':'zip','application/pdf':'pdf','image/png':'png','image/jpeg':'jpg','image/webp':'webp'} as Record<string,string>)[contentType];
    const filename=(file.name.replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,120)||'download')+'.'+extension;
    const uploaded=await d.putAsset(assetPath(productId,filename),bytes,contentType,token);if(!privateCommerceUrl(uploaded.url))throw new CommerceError('Die Datei wurde nicht in einem privaten Shop-Speicher abgelegt.',502,'ASSET_PRIVATE_REQUIRED');
    const asset:CommerceAsset={url:uploaded.url,filename,contentType,createdAt:new Date(now()).toISOString(),size:bytes.byteLength,sha256:createHash('sha256').update(bytes).digest('hex')};await d.setRecord('commerce-assets',productId,asset);return {productId,status:'ready' as const,filename,contentType,createdAt:asset.createdAt,size:asset.size};
  }
  async function digitalDownload(token:string){
    const [payload,signature,...rest]=token.split('.');if(rest.length||!payload||!signature||!validAccess('download:'+payload,signature,secret()))throw new CommerceError('Dieser Download-Link ist ungültig.',403,'DOWNLOAD_INVALID');
    let parsed:{orderId:string;grantId:string};try{parsed=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));if(typeof parsed.orderId!=='string'||typeof parsed.grantId!=='string')throw new Error();}catch{throw new CommerceError('Dieser Download-Link ist ungültig.',403,'DOWNLOAD_INVALID');}
    const current=await getOrder(parsed.orderId),grant=current.grants.find(g=>g.id===parsed.grantId);
    if(current.status!=='paid'||!grant||Date.parse(grant.expiresAt)<=now()||grant.downloads>=20)throw new CommerceError('Dieser Download ist abgelaufen, ausgeschöpft oder nicht freigegeben. Bitte öffne deinen Bestellstatus.',403,'DOWNLOAD_UNAVAILABLE');
    const asset=await d.getRecord<CommerceAsset>('commerce-assets',grant.productId),tokenValue=env().PRIVATE_COMMERCE_BLOB_READ_WRITE_TOKEN;
    if(!asset||!privateCommerceUrl(asset.url)||!tokenValue)throw new CommerceError('Die geschützte Datei ist gerade nicht verfügbar. Bitte versuche es später erneut.',503,'ASSET_UNAVAILABLE');
    const fetched=await d.getAsset(asset.url,tokenValue);
    if(!fetched||fetched.statusCode!==200||!fetched.stream||fetched.blob.url!==asset.url||!privateCommerceUrl(fetched.blob.url)||fetched.blob.pathname!==decodeURIComponent(new URL(asset.url).pathname.slice(1))||!fetched.blob.size||fetched.blob.size>COMMERCE_LIMITS.maxFileBytes||asset.size!==undefined&&asset.size!==fetched.blob.size)throw new CommerceError('Die geschützte Datei konnte nicht geprüft werden.',503,'ASSET_UNAVAILABLE');
    const reader=fetched.stream.getReader(),chunks:Uint8Array[]=[];let size=0;
    try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>COMMERCE_LIMITS.maxFileBytes||size>fetched.blob.size)throw new CommerceError('Die geschützte Datei überschreitet ihre freigegebene Größe.',503,'ASSET_UNAVAILABLE');chunks.push(part.value);}}catch(error){await reader.cancel().catch(()=>{});throw error;}
    const bytes=Buffer.concat(chunks);let type:string;
    try{type=validateDigitalBytes(bytes,fetched.blob.contentType??undefined);validateDigitalBytes(bytes,asset.contentType);}catch{throw new CommerceError('Die geschützte Datei konnte nicht geprüft werden. Bitte versuche es später erneut.',503,'ASSET_UNAVAILABLE');}
    if(size!==fetched.blob.size||asset.sha256&&createHash('sha256').update(bytes).digest('hex')!==asset.sha256)throw new CommerceError('Die geschützte Datei stimmt nicht mit der Freigabe überein.',503,'ASSET_UNAVAILABLE');
    await mutate(s=>({...s,orders:s.orders.map(o=>{if(o.id!==parsed.orderId)return o;const g=o.grants.find(g=>g.id===parsed.grantId);if(o.status!=='paid'||!g||g.downloads>=20||Date.parse(g.expiresAt)<=now())throw new CommerceError('Dieser Download ist nicht mehr freigegeben.',403,'DOWNLOAD_UNAVAILABLE');return {...o,grants:o.grants.map(g=>g.id===parsed.grantId?{...g,downloads:g.downloads+1}:g)};})}));
    const filename=asset.filename.replace(/[^a-zA-Z0-9._-]/g,'-').slice(0,140)||'download';return new Response(bytes,{headers:{'Content-Type':type,'Content-Length':String(size),'Content-Disposition':'attachment; filename="'+filename+'"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
  }
  async function publicCatalog(){const {config}=await commerceConfig();const entries=await inventory(config.products.filter(p=>p.active));return {inventory:entries.map(({productId,available})=>({productId,available}))};}
  async function orderDocument(id:string,key:string){if(!validAccess('order:'+id,key,secret()))throw new CommerceError('Dieser Bestellzugang ist ungültig.',403,'ACCESS_INVALID');const order=await getOrder(id);if(!['paid','refunded'].includes(order.status))throw new CommerceError('Ein Beleg steht nach bestätigter Zahlung bereit.',409,'PAYMENT_UNCONFIRMED');const design=order.business?.design|| (order.business?.designId?await d.getRecord<DocumentDesign>('business-designs',order.business.designId):null)||defaultDocumentDesign('Shop');return{input:orderBusinessDocument(order,design),design};}
  return {commerceConfig,adminSnapshot,commerceConnectionStatus:async()=>((await adminSnapshot()).connection),createCheckout,handleStripeEvent,attemptOrderMail,listOrders,fulfillOrder,publicOrder,orderAction,uploadDigitalAsset,digitalDownload,publicCatalog,orderDocument,adminOrderDocument:(id:string)=>orderDocument(id,signAccess('order:'+id,secret()))};
}
