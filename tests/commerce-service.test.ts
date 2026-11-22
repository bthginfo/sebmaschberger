import test from 'node:test';
import assert from 'node:assert/strict';
import seed from './fixtures/starter-content.json';
import {createCommerceService,type CommerceDependencies} from '../src/lib/commerce/engine';
import {CommerceError,emptyCommerceStore,signAccess,type CommerceStore} from '../src/lib/commerce/model';
import {CheckoutAttemptLimitError,clearCheckoutAttempt,markCheckoutAttemptSubmitted,prepareCheckoutAttempt,readCheckoutAttempt,saveCheckoutAttempt} from '../src/lib/commerce/checkout-attempt';
import {COMMERCE_LIMITS} from '../src/lib/commerce/contracts';
import {stripeValidationRejected} from '../src/lib/commerce/stripe-mode';
import type {SiteSettings,WebsiteContent} from '../src/lib/types';

function fixture(){
  let clock=Date.parse('2026-10-31T12:00:00.000Z'),sequence=0,creates=0,timeoutOnce=false,mailFail=false;
  const published=structuredClone(seed) as WebsiteContent;
  published.config.modules={creator:{enabled:true,surface:'profile',demoBasePath:'/demo/creator'},commerce:{enabled:true,currency:'EUR',shippingCents:490,products:[{id:'shirt',slug:'shirt',title:'Shirt',description:'',kind:'physical',priceCents:3000,stock:1,variants:['M','L'],active:true},{id:'guide',slug:'guide',title:'Guide',description:'',kind:'digital',priceCents:1000,active:true}]}};
  const draft=structuredClone(published.config);
  const settings:SiteSettings={smtp:{enabled:false,host:'mail.example.test',port:465,secure:true,user:'',from:'shop@example.test',to:'owner@example.test'},retentionDays:365,onboardingComplete:true,siteUrl:'https://shop.example.test',storageRegion:'test',databaseRegion:'test'};
  const env:Record<string,string|undefined>={NODE_ENV:'test',AUTH_SECRET:'fixture-access-secret-with-over-32-characters',STRIPE_SECRET_KEY:'sk_test_fixture_not_a_provider_key',STRIPE_WEBHOOK_SECRET:'fixture-not-a-webhook-secret',COMMERCE_CHECKOUT_ENABLED:'1',PRIVATE_COMMERCE_BLOB_READ_WRITE_TOKEN:'fixture-private-store-only'};
  const records=new Map<string,unknown>();let state=emptyCommerceStore();
  const sessions=new Map<string,Record<string,any>>(),idempotency=new Map<string,Record<string,any>>();
  const requests:{path:string;body?:string;key?:string}[]=[],mails:unknown[]=[];
  const assetBytes=Buffer.from('%PDF-1.7\nfixture only\n');const assetUrl='https://fixture.private.blob.vercel-storage.com/commerce/guide/guide.pdf';
  const assets=new Map<string,{bytes:Uint8Array;type:string}>([[assetUrl,{bytes:assetBytes,type:'application/pdf'}]]);
  records.set('commerce-assets:guide',{url:assetUrl,filename:'guide.pdf',contentType:'application/pdf',createdAt:new Date(clock).toISOString(),size:assetBytes.length});
  const deps:CommerceDependencies={
    env:()=>env,now:()=>clock,uuid:()=> 'fixture-'+(++sequence),
    getPublished:async()=>structuredClone(published),getDraftConfig:async()=>structuredClone(draft),getSettings:async()=>structuredClone(settings),
    getRecord:async<T>(collection:string,id:string)=>(collection==='commerce'&&id==='state'?structuredClone(state):structuredClone(records.get(collection+':'+id)??null)) as T|null,
    setRecord:async(collection,id,data)=>{records.set(collection+':'+id,structuredClone(data));},
    mutate:async update=>{state=structuredClone(update(structuredClone(state)));return structuredClone(state);},
    stripe:async(path,body,key)=>{
      requests.push({path,body:body?.toString(),key});
      if(path==='checkout/sessions'&&body){
        let session=idempotency.get(key!);
        if(!session){creates++;const order=state.orders.find(o=>o.id===body.get('client_reference_id'))!;session={id:'cs_test_'+order.id.replace(/-/g,'_'),client_reference_id:order.id,metadata:{orderId:order.id},amount_total:order.totalCents,currency:'eur',status:'open',payment_status:'unpaid',expires_at:Math.floor(clock/1000)+86400,url:'https://checkout.stripe.com/c/pay/'+order.id};sessions.set(session.id,session);idempotency.set(key!,session);}
        if(timeoutOnce){timeoutOnce=false;throw new CommerceError('Ambiguous fixture timeout',502,'PROVIDER_UNAVAILABLE');}
        return structuredClone(session);
      }
      const id=decodeURIComponent(path.split('/')[2]||'');const session=sessions.get(id);if(!session)throw new Error('Unknown fixture session');
      if(path.endsWith('/expire')){if(session.status!=='open')throw new CommerceError('No longer open',409);session.status='expired';session.url=null;}
      return structuredClone(session);
    },
    putAsset:async(pathname,bytes,type)=>{const url='https://fixture.private.blob.vercel-storage.com/'+pathname;assets.set(url,{bytes,type});return {url};},
    getAsset:async url=>{const asset=assets.get(url);return asset?{statusCode:200,stream:new ReadableStream({start(controller){controller.enqueue(asset.bytes);controller.close();}}),blob:{url,pathname:decodeURIComponent(new URL(url).pathname.slice(1)),contentType:asset.type,size:asset.bytes.byteLength}}:null;},
    sendMail:async message=>{if(mailFail)throw new Error('Fixture mail failure');mails.push(message);},
  };
  const service=createCommerceService(deps);
  const key='stable-fixture-attempt-0001';
  async function pay(orderId:string,eventId='evt_paid'){
    const order=state.orders.find(o=>o.id===orderId)!;const session=sessions.get(order.stripeSessionId!)!;session.status='complete';session.payment_status='paid';session.payment_intent='pi_'+order.id;session.customer_details={email:'buyer@example.test'};
    await service.handleStripeEvent({id:eventId,type:'checkout.session.completed',livemode:false,data:{object:structuredClone(session)}});
  }
  async function refund(orderId:string,amount:number,eventId='evt_refund'){
    const order=state.orders.find(o=>o.id===orderId)!;
    await service.handleStripeEvent({id:eventId,type:'charge.refunded',livemode:false,data:{object:{id:'ch_'+order.id,metadata:{orderId},payment_intent:'pi_'+order.id,amount:order.totalCents,amount_refunded:amount,currency:'eur'}}});
  }
  return {service,deps,published,draft,settings,env,records,sessions,requests,mails,assets,assetUrl,key,pay,refund,state:()=>structuredClone(state),setState:(value:CommerceStore)=>{state=structuredClone(value);},advance:(ms:number)=>{clock+=ms;},timeout:()=>{timeoutOnce=true;},failMail:(fail:boolean)=>{mailFail=fail;},creates:()=>creates,access:(id:string)=>signAccess('order:'+id,env.AUTH_SECRET!)};
}

test('real service uses persisted authoritative intent and safely replays parallel/ambiguous checkout creation',async()=>{
  const f=fixture();f.timeout();
  await assert.rejects(f.service.createCheckout([{productId:'shirt',variant:'M',quantity:1}],f.key),(e:unknown)=>e instanceof CommerceError&&e.code==='PROVIDER_UNAVAILABLE');
  f.advance(2*60000);
  const [a,b]=await Promise.all([f.service.createCheckout([{productId:'shirt',variant:'M',quantity:1}],f.key),f.service.createCheckout([{productId:'shirt',variant:'M',quantity:1}],f.key)]);
  assert.equal(a.orderId,b.orderId);assert.equal(f.creates(),1);assert.equal(f.state().orders.length,1);
  const bodies=f.requests.filter(r=>r.path==='checkout/sessions');assert.equal(bodies[0].body,bodies[1].body);assert.equal(new URLSearchParams(bodies[0].body).get('expires_at'),null);
  assert.equal(new URLSearchParams(bodies[0].body).get('line_items[0][price_data][unit_amount]'),'3000');
  await assert.rejects(f.service.createCheckout([{productId:'shirt',variant:'L',quantity:1}],f.key),(e:unknown)=>e instanceof CommerceError&&e.code==='ATTEMPT_CART_MISMATCH');
});

test('stock=1 cancel/reopen resumes the same checkout and changed cart expires old provider session before reserving',async()=>{
  const f=fixture();const a=await f.service.createCheckout([{productId:'shirt',variant:'M',quantity:1}],f.key);
  const again=await f.service.createCheckout([{productId:'shirt',variant:'M',quantity:1}],f.key);assert.equal(again.url,a.url);assert.equal(f.creates(),1);
  const b=await f.service.createCheckout([{productId:'shirt',variant:'L',quantity:1}],'next-fixture-attempt-0002',f.key);
  assert.equal(f.state().orders.find(o=>o.id===a.orderId)?.status,'expired');assert.equal(b.state,'open');assert.equal(f.creates(),2);
  const before=f.requests.findIndex(r=>r.path.endsWith('/expire')),after=f.requests.findIndex((r,index)=>index>before&&r.path==='checkout/sessions');assert(before>=0&&after>before);
  const canceled=await f.service.orderAction(b.orderId,f.access(b.orderId),'cancel');assert.equal(canceled.order.status,'expired');assert(canceled.order.checkout.canRestart);
});

test('completed/processing checkout never silently creates a second order and signed return alone is no payment proof',async()=>{
  const f=fixture(),a=await f.service.createCheckout([{productId:'shirt',variant:'M',quantity:1}],f.key);
  const pending=await f.service.publicOrder(a.orderId,f.access(a.orderId));assert.equal(pending.status,'pending');assert.equal(pending.downloads.length,0);
  const session=f.sessions.get(f.state().orders[0].stripeSessionId!)!;session.status='complete';
  const processing=await f.service.orderAction(a.orderId,f.access(a.orderId),'refresh');assert.equal(processing.order.status,'processing');
  const blocked=await f.service.createCheckout([{productId:'guide',quantity:1}],'changed-fixture-attempt-0003',f.key);assert.equal(blocked.orderId,a.orderId);assert.equal(blocked.state,'processing');assert.equal(f.creates(),1);
  await f.pay(a.orderId);const replay=await f.service.createCheckout([{productId:'shirt',variant:'M',quantity:1}],f.key);assert.equal(replay.state,'complete');assert.equal(f.creates(),1);
});

test('disabled/removed sales do not revoke paid receipt, private download or authenticated maintenance',async()=>{
  const f=fixture(),a=await f.service.createCheckout([{productId:'guide',quantity:1}],f.key);await f.pay(a.orderId);
  delete f.published.config.modules!.commerce;
  const order=await f.service.publicOrder(a.orderId,f.access(a.orderId));assert.equal(order.status,'paid');assert(order.downloads[0].url);
  const response=await f.service.digitalDownload(order.downloads[0].url!.split('/').pop()!);assert.equal(response.status,200);assert.equal(await response.text(),'%PDF-1.7\nfixture only\n');assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.equal((await f.service.listOrders()).length,1);await f.service.fulfillOrder(a.orderId,'Fixture only');
  await assert.rejects(f.service.createCheckout([{productId:'guide',quantity:1}],'disabled-fixture-attempt-0004'),(e:unknown)=>e instanceof CommerceError&&e.code==='SALES_DISABLED');
});

test('partial/full refunds are cumulative, monotonic and idempotent, including refund-before-paid',async()=>{
  const f=fixture(),a=await f.service.createCheckout([{productId:'guide',quantity:1}],f.key);
  await f.refund(a.orderId,200,'refund_early');await f.pay(a.orderId);
  let order=await f.service.publicOrder(a.orderId,f.access(a.orderId));assert.equal(order.status,'paid');assert.equal(order.refundStatus,'partial');assert.equal(order.refundedCents,200);assert(order.downloads[0].url);
  await f.refund(a.orderId,600,'refund_more');await f.refund(a.orderId,200,'refund_older');await f.refund(a.orderId,600,'refund_more');
  order=await f.service.publicOrder(a.orderId,f.access(a.orderId));assert.equal(order.refundedCents,600);assert.equal(f.state().orders[0].grants.length,1);
  await f.refund(a.orderId,1000,'refund_full');await f.pay(a.orderId,'paid_late');
  order=await f.service.publicOrder(a.orderId,f.access(a.orderId));assert.equal(order.status,'refunded');assert.equal(order.refundedCents,1000);assert.equal(order.downloads[0].state,'revoked');assert.equal(order.downloads[0].url,undefined);
  const g=fixture(),b=await g.service.createCheckout([{productId:'guide',quantity:1}],g.key);await g.refund(b.orderId,1000);await g.pay(b.orderId);assert.equal(g.state().orders[0].status,'refunded');assert.equal(g.state().orders[0].grants.length,0);assert.equal(g.state().orders[0].email,'buyer@example.test');
});

test('wrong amount, currency, session or payment intent cannot unlock or alter an order',async()=>{
  for(const patch of [{amount_total:1},{currency:'usd'},{id:'cs_test_other'},{payment_intent:'pi_other'}]){
    const f=fixture(),a=await f.service.createCheckout([{productId:'guide',quantity:1}],f.key);
    if('payment_intent' in patch){await f.pay(a.orderId);const s=f.state();s.orders[0].stripePaymentIntent='pi_expected';f.setState(s);}
    const order=f.state().orders[0],session=f.sessions.get(order.stripeSessionId!)!;
    await assert.rejects(f.service.handleStripeEvent({id:'bad_event',type:'checkout.session.completed',livemode:false,data:{object:{...session,status:'complete',payment_status:'paid',...patch}}}));
    if(!('payment_intent' in patch))assert.equal(f.state().orders[0].status,'pending');
  }
});

test('download grants enforce signature, current payment, expiry and a concurrent atomic 20-use limit',async()=>{
  const f=fixture(),a=await f.service.createCheckout([{productId:'guide',quantity:1}],f.key);await f.pay(a.orderId);
  const receipt=await f.service.publicOrder(a.orderId,f.access(a.orderId)),token=receipt.downloads[0].url!.split('/').pop()!;
  await assert.rejects(f.service.publicOrder(a.orderId,'x'.repeat(43)));await assert.rejects(f.service.digitalDownload(token+'x'));
  const calls=await Promise.allSettled(Array.from({length:21},()=>f.service.digitalDownload(token)));assert.equal(calls.filter(r=>r.status==='fulfilled').length,20);assert.equal(f.state().orders[0].grants[0].downloads,20);
  const exhausted=await f.service.publicOrder(a.orderId,f.access(a.orderId));assert.equal(exhausted.downloads[0].state,'exhausted');assert.equal(exhausted.downloads[0].url,undefined);
  f.advance(8*86400000);assert.equal((await f.service.publicOrder(a.orderId,f.access(a.orderId))).downloads[0].state,'expired');
});

test('download validates private path, provider bytes/type/size before spending a grant',async()=>{
  const f=fixture(),a=await f.service.createCheckout([{productId:'guide',quantity:1}],f.key);await f.pay(a.orderId);
  const token=(await f.service.publicOrder(a.orderId,f.access(a.orderId))).downloads[0].url!.split('/').pop()!;
  f.assets.set(f.assetUrl,{bytes:Buffer.from('<script>bad</script>'),type:'application/pdf'});await assert.rejects(f.service.digitalDownload(token),(e:unknown)=>e instanceof CommerceError&&e.status===503&&e.code==='ASSET_UNAVAILABLE');assert.equal(f.state().orders[0].grants[0].downloads,0);
  f.records.set('commerce-assets:guide',{url:'https://public.example.test/commerce/guide/file.pdf',filename:'file.pdf',contentType:'application/pdf'});await assert.rejects(f.service.digitalDownload(token));assert.equal(f.state().orders[0].grants[0].downloads,0);
});

test('draft digital files stage safely before publication and readiness/asset metadata never exposes credentials/URLs',async()=>{
  const f=fixture();delete f.published.config.modules!.commerce;f.draft.modules!.commerce!.products.push({id:'draft-guide',slug:'draft-guide',title:'Draft',description:'',priceCents:1000,kind:'digital',active:false});
  const uploaded=await f.service.uploadDigitalAsset('draft-guide',new File([Buffer.from('%PDF-1.7\nfixture')],'new.pdf',{type:'application/pdf'}));assert.equal(uploaded.status,'ready');
  await assert.rejects(f.service.uploadDigitalAsset('arbitrary',new File(['%PDF-1.7'],'bad.pdf',{type:'application/pdf'})));
  await assert.rejects(f.service.uploadDigitalAsset('draft-guide',new File(['<script>bad</script>'],'bad.pdf',{type:'application/pdf'})));
  const snapshot=await f.service.adminSnapshot();assert.equal(snapshot.connection.salesEnabled,false);assert.equal(snapshot.assets.find(a=>a.productId==='draft-guide')?.status,'ready');
  const serialized=JSON.stringify(snapshot);assert(!serialized.includes('fixture-not-a-provider-key'));assert(!serialized.includes('fixture-private-store-only'));assert(!serialized.includes('blob.vercel-storage.com'));
  f.env.AUTH_SECRET='weak';assert.equal((await f.service.adminSnapshot()).connection.checks.find(c=>c.id==='access')?.state,'missing');
});

test('existing private ZIP/octet-stream assets retain paid download access after byte validation',async()=>{
  for(const contentType of ['application/x-zip-compressed','application/octet-stream']){
    const f=fixture(),a=await f.service.createCheckout([{productId:'guide',quantity:1}],f.key);await f.pay(a.orderId);
    const bytes=Buffer.from([80,75,3,4,0,0,0,0]);f.assets.set(f.assetUrl,{bytes,type:contentType});
    f.records.set('commerce-assets:guide',{url:f.assetUrl,filename:'legacy.zip',contentType,createdAt:'2026-10-01T00:00:00Z'});
    const token=(await f.service.publicOrder(a.orderId,f.access(a.orderId))).downloads[0].url!.split('/').pop()!;
    const response=await f.service.digitalDownload(token);assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/zip');
  }
});

test('truthful mail outcomes and partial refund amounts remain retryable without invoking SMTP',async()=>{
  const f=fixture(),a=await f.service.createCheckout([{productId:'guide',quantity:1}],f.key);await f.pay(a.orderId);assert.equal(f.state().orders[0].mail.status,'not-configured');
  f.settings.smtp.enabled=true;f.failMail(true);await f.service.attemptOrderMail(a.orderId);assert.equal(f.state().orders[0].mail.status,'failed');
  f.failMail(false);await f.service.attemptOrderMail(a.orderId);assert.equal(f.state().orders[0].mail.status,'sent');assert.equal(f.mails.length,1);
  await f.refund(a.orderId,200);assert.equal(f.state().orders[0].mail.kind,'partial-refund');assert.equal((f.mails[1] as {refundedCents:number}).refundedCents,200);
});

test('inventory uses allocated stock, while new zero/low/oversized orders fail clearly',async()=>{
  const f=fixture();await f.service.createCheckout([{productId:'shirt',variant:'M',quantity:1}],f.key);
  assert.equal((await f.service.publicCatalog()).inventory.find(p=>p.productId==='shirt')?.available,0);
  for(const price of [0,49,100000000]){f.published.config.modules!.commerce!.products[1].priceCents=price;await assert.rejects(f.service.createCheckout([{productId:'guide',quantity:1}],'invalid-price-attempt-'+price));}
});

test('browser attempt survives reload, changed cart retains previous capability, and completion clears only its purchased cart',()=>{
  const entries=new Map<string,string>(),storage={getItem:(k:string)=>entries.get(k)??null,setItem:(k:string,v:string)=>{entries.set(k,v);},removeItem:(k:string)=>{entries.delete(k);}};
  const items=[{productId:'shirt',variant:'M',quantity:1}],cartKey='creator-cart:fixture:v1';let ids=0;
  storage.setItem(cartKey,JSON.stringify({lines:items}));const first=markCheckoutAttemptSubmitted(storage,prepareCheckoutAttempt(storage,items,cartKey,()=> 'browser-attempt-'+(++ids)));
  const reloaded=prepareCheckoutAttempt(storage,items,cartKey,()=> 'browser-attempt-'+(++ids));assert.equal(first.key,reloaded.key);assert.equal(ids,1);
  const changed=prepareCheckoutAttempt(storage,[{...items[0],variant:'L'}],cartKey,()=> 'browser-attempt-'+(++ids));assert.equal(changed.previousKey,first.key);
  saveCheckoutAttempt(storage,{...changed,orderId:'paid-order'});clearCheckoutAttempt(storage,'different-order',true);assert(storage.getItem('ws-commerce-checkout:v1'));
  clearCheckoutAttempt(storage,'paid-order',true);assert.equal(JSON.parse(storage.getItem(cartKey)!).lines.length,1);
});

test('multiple unsent cart edits retain the submitted stock reservation until the real service retires it',async()=>{
  const f=fixture(),entries=new Map<string,string>(),storage={getItem:(k:string)=>entries.get(k)??null,setItem:(k:string,v:string)=>{entries.set(k,v);},removeItem:(k:string)=>{entries.delete(k);}};
  let ids=0;const key=()=> 'edited-browser-attempt-'+(++ids),cartKey='creator-cart:fixture:v1';
  const aItems=[{productId:'shirt',variant:'M',quantity:1}],bItems=[{productId:'shirt',variant:'L',quantity:1}];
  const a=markCheckoutAttemptSubmitted(storage,prepareCheckoutAttempt(storage,aItems,cartKey,key));const first=await f.service.createCheckout(aItems,a.key);
  const b=prepareCheckoutAttempt(storage,bItems,cartKey,key);assert.equal(b.submitted,false);assert.equal(b.previousKey,a.key);
  const c=prepareCheckoutAttempt(storage,aItems,cartKey,key);assert.equal(c.previousKey,a.key);assert.equal(c.submitted,false);
  const reloaded=prepareCheckoutAttempt(storage,aItems,cartKey,key);assert.equal(reloaded.key,c.key);assert.equal(reloaded.previousKey,a.key);
  const submitted=markCheckoutAttemptSubmitted(storage,reloaded);const next=await f.service.createCheckout(aItems,submitted.key,submitted.previousKey,submitted.previousKeys);
  assert.equal(f.state().orders.find(o=>o.id===first.orderId)?.status,'expired');assert.equal(next.state,'open');assert.equal(f.creates(),2);assert.equal(f.state().orders.length,2);
});

test('a submitted ambiguous replacement becomes the next retirement target and is replayed before release',async()=>{
  const f=fixture(),entries=new Map<string,string>(),storage={getItem:(k:string)=>entries.get(k)??null,setItem:(k:string,v:string)=>{entries.set(k,v);},removeItem:(k:string)=>{entries.delete(k);}};
  let ids=0;const key=()=> 'ambiguous-browser-attempt-'+(++ids),cartKey='creator-cart:fixture:v1';
  const aItems=[{productId:'shirt',variant:'M',quantity:1}],bItems=[{productId:'shirt',variant:'L',quantity:1}];
  const a=markCheckoutAttemptSubmitted(storage,prepareCheckoutAttempt(storage,aItems,cartKey,key));await f.service.createCheckout(aItems,a.key);
  const b=markCheckoutAttemptSubmitted(storage,prepareCheckoutAttempt(storage,bItems,cartKey,key));f.timeout();await assert.rejects(f.service.createCheckout(bItems,b.key,b.previousKey));
  const c=prepareCheckoutAttempt(storage,aItems,cartKey,key);assert.equal(c.previousKey,b.key);
  const submitted=markCheckoutAttemptSubmitted(storage,c);const result=await f.service.createCheckout(aItems,submitted.key,submitted.previousKey,submitted.previousKeys);
  assert.equal(result.state,'open');assert.equal(f.creates(),3);assert.equal(f.state().orders.filter(o=>o.status==='expired').length,2);assert.equal(f.state().orders.filter(o=>o.status==='pending').length,1);
});

test('legacy unknown submission is conservative and storage failure aborts submission without losing the predecessor',()=>{
  const entries=new Map<string,string>();let fail=false;
  const storage={getItem:(k:string)=>entries.get(k)??null,setItem:(k:string,v:string)=>{if(fail)throw new Error('Storage blocked');entries.set(k,v);},removeItem:(k:string)=>{entries.delete(k);}};
  const a=prepareCheckoutAttempt(storage,[{productId:'shirt',variant:'M',quantity:1}],'cart',()=> 'legacy-browser-attempt-A');saveCheckoutAttempt(storage,{...a,submitted:undefined});
  const b=prepareCheckoutAttempt(storage,[{productId:'shirt',variant:'L',quantity:1}],'cart',()=> 'legacy-browser-attempt-B');assert.equal(b.previousKey,a.key);
  let posted=false;fail=true;assert.throws(()=>{markCheckoutAttemptSubmitted(storage,b);posted=true;});assert.equal(posted,false);assert.equal(readCheckoutAttempt(storage)?.submitted,false);
  fail=false;const c=prepareCheckoutAttempt(storage,[{productId:'guide',quantity:1}],'cart',()=> 'legacy-browser-attempt-C');assert.equal(c.previousKey,a.key);
});

test('an early failed replacement with no record retains its older reservation for the next real checkout',async()=>{
  const f=fixture(),entries=new Map<string,string>(),storage={getItem:(k:string)=>entries.get(k)??null,setItem:(k:string,v:string)=>{entries.set(k,v);},removeItem:(k:string)=>{entries.delete(k);}};
  let ids=0;const key=()=> 'early-failure-attempt-'+(++ids),cartKey='creator-cart:fixture:v1';
  const aItems=[{productId:'shirt',variant:'M',quantity:1}],bItems=[{productId:'shirt',variant:'L',quantity:1}];
  const a=markCheckoutAttemptSubmitted(storage,prepareCheckoutAttempt(storage,aItems,cartKey,key));const first=await f.service.createCheckout(aItems,a.key);
  const b=markCheckoutAttemptSubmitted(storage,prepareCheckoutAttempt(storage,bItems,cartKey,key));f.env.COMMERCE_CHECKOUT_ENABLED='0';
  await assert.rejects(f.service.createCheckout(bItems,b.key,b.previousKey,b.previousKeys),(error:unknown)=>error instanceof CommerceError&&error.status===503);assert.equal(f.state().orders.length,1);assert.equal(f.state().orders[0].status,'pending');
  const c=markCheckoutAttemptSubmitted(storage,prepareCheckoutAttempt(storage,aItems,cartKey,key));assert.deepEqual(c.previousKeys,[b.key,a.key]);
  f.env.COMMERCE_CHECKOUT_ENABLED='1';const next=await f.service.createCheckout(aItems,c.key,c.previousKey,c.previousKeys);
  assert.equal(next.state,'open');assert.equal(f.state().orders.find(o=>o.id===first.orderId)?.status,'expired');assert.equal(f.creates(),2);assert.equal(f.state().orders.length,2);
});

test('a completed ancestor behind a missing newer record blocks replacement without creating a duplicate',async()=>{
  const f=fixture(),a=await f.service.createCheckout([{productId:'shirt',variant:'M',quantity:1}],f.key);await f.pay(a.orderId);
  const missing='missing-newer-attempt-key',next=await f.service.createCheckout([{productId:'guide',quantity:1}],'final-ancestor-attempt-key',missing,[missing,f.key]);
  assert.equal(next.state,'complete');assert.equal(next.orderId,a.orderId);assert.equal(f.creates(),1);assert.equal(f.state().orders.length,1);
});

test('bounded ancestry fails closed without discarding the oldest intent or performing provider calls',async()=>{
  const entries=new Map<string,string>(),storage={getItem:(k:string)=>entries.get(k)??null,setItem:(k:string,v:string)=>{entries.set(k,v);},removeItem:(k:string)=>{entries.delete(k);}};
  for(let index=0;index<=COMMERCE_LIMITS.checkoutAncestors;index++){
    const attempt=prepareCheckoutAttempt(storage,[{productId:'product-'+index,quantity:1}],'cart',()=> 'bounded-checkout-attempt-'+index);markCheckoutAttemptSubmitted(storage,attempt);
  }
  const previous=storage.getItem('ws-commerce-checkout:v1');assert.throws(()=>prepareCheckoutAttempt(storage,[{productId:'overflow',quantity:1}],'cart',()=> 'bounded-overflow-attempt-key'),CheckoutAttemptLimitError);
  assert.equal(storage.getItem('ws-commerce-checkout:v1'),previous);assert(readCheckoutAttempt(storage)?.previousKeys?.includes('bounded-checkout-attempt-0'));
  const f=fixture(),ancestors=Array.from({length:COMMERCE_LIMITS.checkoutAncestors+1},(_,index)=>'bounded-server-ancestor-'+index);
  await assert.rejects(f.service.createCheckout([{productId:'guide',quantity:1}],f.key,ancestors[0],ancestors),(error:unknown)=>error instanceof CommerceError&&error.code==='ATTEMPT_CHAIN_LIMIT');assert.equal(f.creates(),0);assert.equal(f.state().orders.length,0);
});


test('selected delivery country binds the provider request, replay and paid webhook',async()=>{const f=fixture(),c=f.published.config.modules!.commerce!;c.taxRules=[{id:'standard',name:'Standard',rate:19}];c.products.forEach(p=>p.taxRuleId='standard');c.shippingZones=[{id:'de',name:'Deutschland',countries:['DE'],shippingCents:490,taxRuleId:'standard',active:true},{id:'at',name:'Österreich',countries:['AT'],shippingCents:990,taxRuleId:'standard',active:true}];const a=await f.service.createCheckout([{productId:'shirt',quantity:1,variant:'M'}],f.key,undefined,[],'DE');const body=new URLSearchParams(f.requests.find(r=>r.path==='checkout/sessions')!.body);assert.equal(body.get('shipping_address_collection[allowed_countries][0]'),'DE');assert.equal(body.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]'),'490');await assert.rejects(f.service.createCheckout([{productId:'shirt',quantity:1,variant:'M'}],f.key,undefined,[],'AT'),(e:unknown)=>e instanceof CommerceError&&e.code==='ATTEMPT_CART_MISMATCH');const o=f.state().orders[0],session=f.sessions.get(o.stripeSessionId!)!;await assert.rejects(f.service.handleStripeEvent({id:'country-mismatch',type:'checkout.session.completed',livemode:false,data:{object:{...session,status:'complete',payment_status:'paid',shipping_details:{address:{country:'AT'}}}}}));assert.equal(f.state().orders[0].status,'pending');await assert.rejects(f.service.orderDocument(a.orderId,f.access(a.orderId)));});
test('new paid invoices receive one atomic number and preserve branding, buyer and totals through refunds',async()=>{const {initialBusinessSettings}=await import('../src/lib/business/settings');const f=fixture(),c=f.published.config.modules!.commerce!;c.taxRules=[{id:'standard',name:'Standard',rate:19}];c.products.forEach(p=>p.taxRuleId='standard');const settings=initialBusinessSettings(f.published.config);c.products.find(p=>p.id==='shirt')!.active=false;settings.invoiceEnabled=true;settings.profile={name:'Eigener Testshop',address:'Teststraße 1\n85049 Ingolstadt',email:'shop@example.test',phone:'',taxId:'TEST-UST',iban:'',taxMode:'vat'};f.records.set('business-documents:settings',settings);const a=await f.service.createCheckout([{productId:'guide',quantity:1}],f.key),o=f.state().orders[0],session=f.sessions.get(o.stripeSessionId!)!;const event={id:'invoice-paid',type:'checkout.session.completed',livemode:false,data:{object:{...session,status:'complete',payment_status:'paid',customer_details:{name:'Alex Muster',email:'buyer@example.test',address:{line1:'Musterweg 2',postal_code:'85049',city:'Ingolstadt',country:'DE'}}}}};await f.service.handleStripeEvent(event);await f.service.handleStripeEvent({...event,id:'second-paid'});assert.equal(f.state().documentNumbers?.['2026'],1);assert.equal(f.state().orders[0].documentNumber,'SHOP-2026-00001');const first=await f.service.orderDocument(a.orderId,f.access(a.orderId));assert.equal(first.input.kind,'invoice');assert.equal(first.input.buyer.name,'Alex Muster');settings.design.brandName='Später anderer Name';settings.profile.address='Neue Anschrift';f.records.set('business-documents:settings',settings);await f.refund(a.orderId,500);const later=await f.service.orderDocument(a.orderId,f.access(a.orderId));assert.deepEqual(later,first);await assert.rejects(f.service.orderDocument(a.orderId,'x'.repeat(43)));});
test('invoice and small-business readiness fail before a provider call when tax configuration is contradictory',async()=>{const {initialBusinessSettings}=await import('../src/lib/business/settings');const f=fixture(),settings=initialBusinessSettings(f.published.config);settings.invoiceEnabled=true;settings.profile={...settings.profile,name:'Test',address:'Teststraße 1',email:'shop@example.test',taxId:'TEST'};f.records.set('business-documents:settings',settings);await assert.rejects(f.service.createCheckout([{productId:'guide',quantity:1}],f.key));assert.equal(f.creates(),0);assert((await f.service.adminSnapshot()).connection.checks.some(c=>c.id==='taxes'&&c.state==='missing'));});
test('changing country creates a new browser attempt and retains its submitted predecessor',()=>{const values=new Map<string,string>(),storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);},removeItem:(k:string)=>{values.delete(k);}};const cart=[{productId:'shirt',quantity:1}];const a=markCheckoutAttemptSubmitted(storage,prepareCheckoutAttempt(storage,cart,'cart',()=> 'country-fixture-attempt-0001','DE'));const b=prepareCheckoutAttempt(storage,cart,'cart',()=> 'country-fixture-attempt-0002','AT');assert.notEqual(a.key,b.key);assert.equal(b.previousKey,a.key);assert.equal(b.country,'AT');});

test('confirmed first Stripe validation rejection releases finite stock and leaves a terminal receipt', async()=>{
  const f=fixture(),stripe=f.deps.stripe;
  f.deps.stripe=async (path,body,key)=>{
    if(path==='checkout/sessions')throw new CommerceError('Confirmed fixture validation rejection',502,'CHECKOUT_PROVIDER_REJECTED');
    return stripe(path,body,key);
  };
  const cart=[{productId:'shirt',variant:'M',quantity:1}];
  const terminal=await f.service.createCheckout(cart,f.key);
  assert.equal(terminal.state,'terminal');
  assert.equal(f.state().orders[0].checkoutFailure,'provider-rejected');
  assert.equal((await f.service.publicCatalog()).inventory.find(p=>p.productId==='shirt')?.available,1);
  f.deps.stripe=stripe;
  const reopened=await f.service.createCheckout(cart,'new-after-provider-rejection',f.key);
  assert.equal(reopened.state,'open');
  assert.notEqual(reopened.orderId,terminal.orderId);
});

test('a rejected replay does not release stock when a previous provider result was uncertain', async()=>{
  const f=fixture();f.timeout();
  const cart=[{productId:'shirt',variant:'M',quantity:1}];
  await assert.rejects(f.service.createCheckout(cart,f.key), (e:unknown)=>e instanceof CommerceError&&e.code==='PROVIDER_UNAVAILABLE');
  f.deps.stripe=async()=>{throw new CommerceError('Rejected retry',502,'CHECKOUT_PROVIDER_REJECTED');};
  await assert.rejects(f.service.createCheckout(cart,f.key), (e:unknown)=>e instanceof CommerceError&&e.code==='CHECKOUT_PROVIDER_REJECTED');
  assert.equal(f.state().orders[0].status,'pending');
  assert.equal((await f.service.publicCatalog()).inventory.find(p=>p.productId==='shirt')?.available,0);
});

test('Stripe validation errors are distinct from idempotency conflicts and transient failures',()=>{
  const error={type:'invalid_request_error',param:'payment_method_types[1]',code:'payment_method_unactivated'};
  assert.equal(stripeValidationRejected(400,{error}),true);
  for(const status of [401,409,429,500])assert.equal(stripeValidationRejected(status,{error}),false);
  assert.equal(stripeValidationRejected(400,{error:{...error,code:'idempotency_key_in_use'}}),false);
  assert.equal(stripeValidationRejected(400,{error:{type:'invalid_request_error'}}),false);
});

test('a public production checkout refuses test keys and ignores signed sandbox events', async()=>{
  const f=fixture();f.env.VERCEL_ENV='production';f.env.NODE_ENV='production';
  const cart=[{productId:'guide',quantity:1}];
  assert.equal((await f.service.commerceConnectionStatus()).checkout,false);
  await assert.rejects(f.service.createCheckout(cart,f.key), (e:unknown)=>e instanceof CommerceError&&e.code==='CHECKOUT_UNCONFIGURED');
  assert.equal(f.state().orders.length,0);
  f.env.STRIPE_SECRET_KEY='sk_live_fixture_not_a_provider_key';
  const checkout=await f.service.createCheckout(cart,f.key);
  const order=f.state().orders[0];
  const object={...f.sessions.get(order.stripeSessionId!)!,status:'complete',payment_status:'paid'};
  await f.service.handleStripeEvent({id:'sandbox',type:'checkout.session.completed',livemode:false,data:{object}});
  assert.equal(f.state().orders[0].status,'pending');
  await f.service.handleStripeEvent({id:'other-merchant-sale',type:'checkout.session.completed',livemode:true,data:{object:{...object,client_reference_id:'external',metadata:{}}}});
  await f.service.handleStripeEvent({id:'live',type:'checkout.session.completed',livemode:true,data:{object}});
  assert.equal(f.state().orders[0].id,checkout.orderId);
  assert.equal(f.state().orders[0].status,'paid');
});
