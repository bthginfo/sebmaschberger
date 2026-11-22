import test from 'node:test';
import assert from 'node:assert/strict';
import {blueskyLinkFacets} from '../src/lib/server/social/connectors/bluesky-text';
import {createBlueskyClient} from '../src/lib/server/social/connectors/bluesky';
import type {ProviderContext} from '../src/lib/server/social/connectors/provider-contract';

test('Bluesky link facets retain exact UTF-8 offsets after emoji and umlauts',()=>{
 const text='Grüße 👋 Mehr unter https://example.org/über-uns und https://example.org/shop.';
 const bytes=new TextEncoder().encode(text),facets=blueskyLinkFacets(text);
 assert.deepEqual(facets.map(f=>new TextDecoder().decode(bytes.slice(f.index.byteStart,f.index.byteEnd))),['https://example.org/über-uns','https://example.org/shop']);
 assert.deepEqual(facets.map(f=>f.features[0].uri),['https://example.org/%C3%BCber-uns','https://example.org/shop']);
});

test('Bluesky links preserve balanced URL parentheses and exclude surrounding punctuation',()=>{
 const text='(https://example.org/wiki/Test_(eins)), https://example.org/zwei!';
 const bytes=new TextEncoder().encode(text);
 assert.deepEqual(blueskyLinkFacets(text).map(f=>new TextDecoder().decode(bytes.slice(f.index.byteStart,f.index.byteEnd))),['https://example.org/wiki/Test_(eins)','https://example.org/zwei']);
 assert.deepEqual(blueskyLinkFacets('javascript:alert(1) https://user:password@example.org/ https://'),[]);
});

test('Bluesky freezes clickable links in the actual provider record without fetching their targets',async()=>{
 const did='did:plc:'+'a'.repeat(24),ctx:ProviderContext={app:{clientId:'',clientSecret:''},session:{accessToken:'fixture',scopes:[],subject:did,issuedAt:'2026-11-04T10:00:00Z',expiresAt:null,extra:{pds:'https://fixture.host.bsky.network'}},target:{id:did,kind:'profile',label:'Own fixture'},post:{id:'fixture',generation:1,kind:'text',caption:'Neu 👋 https://example.org/angebot',altText:'',title:'Own post',scheduledAt:'2026-11-04T10:00:00Z'},media:null,mediaUrl:null,now:'2026-11-04T10:00:00Z',key:'fixture:1',state:{},checkpoint:async state=>{ctx.state=state;}};
 let calls=0;
 const client=createBlueskyClient({fetch:async(input,init)=>{calls++;assert.equal(String(input),'https://fixture.host.bsky.network/xrpc/com.atproto.repo.createRecord');const body=JSON.parse(String(init?.body));assert.equal(body.record.facets[0].features[0].uri,'https://example.org/angebot');return Response.json({uri:'at://'+did+'/app.bsky.feed.post/'+body.rkey,cid:'fixture-cid'});}});
 await client.prepare(ctx);assert.equal(calls,0);assert.equal((await client.publish(ctx)).outcome,'published');assert.equal(calls,1);
});
