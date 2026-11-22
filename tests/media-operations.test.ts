import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createMediaOperations,MediaOperationError,type MediaOperations} from '../src/lib/media-operations';
import {hasLocalMediaReference,hasRemoteMediaReference,MEDIA_REFERENCE_QUERY} from '../src/lib/media-references';
import type {MediaAsset} from '../src/lib/types';

const asset:MediaAsset={id:'retained-image',url:'https://own.public.blob.vercel-storage.com/image.webp',name:'Image',alt:'',type:'image/webp',size:1,position:'50% 50%',createdAt:'2026-10-31T00:00:00Z'};
function memory(overrides:Partial<MediaOperations>={}){
 const calls:string[]=[],records=new Map<string,MediaAsset>();
 const io:MediaOperations={configured:()=>true,put:async(_path,bytes)=>{calls.push('put');assert.equal((await sharp(bytes).metadata()).format,'webp');return{url:asset.url};},removeBlob:async()=>{calls.push('blob.delete');},save:async value=>{calls.push('save');records.set(value.id,value);},find:async id=>records.get(id)??null,referenced:async()=>false,removeRecord:async id=>{calls.push('record.delete');records.delete(id);},...overrides};
 return{io,calls,records,service:createMediaOperations(io)};
}
async function imageFile(){return new File([new Uint8Array(await sharp({create:{width:3000,height:1200,channels:3,background:'#889977'}}).png().toBuffer())],'sample.png',{type:'image/png'});}

test('retained-media checks include version content and private social proxy references, excluding inventory itself',()=>{
 assert(hasLocalMediaReference({state:{draft:{},published:{},revisions:[{content:{image:asset.url}}]},records:{}},asset));
 assert(hasLocalMediaReference({state:{},records:{'social-projects:post':{project:{image:'/api/admin/social/media/'+asset.id}}}},asset));
 assert(hasLocalMediaReference({state:{},records:{'social-brand:default':{brand:{logoSrc:'/api/admin/social/media/'+asset.id}}}},asset));
 assert(!hasLocalMediaReference({state:{},records:{['media:'+asset.id]:asset}},asset));
});

test('remote deletion queries persisted revision content even when admin revisions contain metadata only',async()=>{
 let calls=0;const result=await hasRemoteMediaReference(async(sql,parameters)=>{calls++;assert.equal(sql,MEDIA_REFERENCE_QUERY);assert.match(sql,/ws_revisions WHERE strpos\(content::text,\$1\)>0/);assert.match(sql,/social-projects/);assert.deepEqual(parameters,[asset.url,'/api/admin/social/media/'+asset.id]);return[{referenced:true}];},asset);
 assert.equal(calls,1);assert.equal(result,true);
});

test('media upload normalizes raster dimensions and records actual encoded metadata',async()=>{
 const m=memory(),file=await imageFile(),saved=await m.service.upload(file,'Alternative');
 assert.equal(saved.width,2560);assert.equal(saved.height,1024);assert.equal(saved.type,'image/webp');assert.equal(saved.alt,'Alternative');assert(saved.size>0);assert(m.records.has(saved.id));assert.deepEqual(m.calls,['put','save']);
});

test('invalid raster declarations fail before provider I/O',async()=>{
 const m=memory();await assert.rejects(()=>m.service.upload(new File(['not an image'],'bad.png',{type:'image/png'})),error=>error instanceof MediaOperationError&&error.status===400);
 const png=await imageFile();await assert.rejects(()=>m.service.upload(new File([png],'mislabelled.jpg',{type:'image/jpeg'})),MediaOperationError);
 assert.deepEqual(m.calls,[]);
});

test('metadata failure removes an uncommitted upload, while ambiguous or committed writes preserve it',async()=>{
 const failure=new Error('Metadata unavailable'),file=await imageFile();
 const failed=memory({save:async()=>{throw failure;}});await assert.rejects(()=>failed.service.upload(file),failure);assert.deepEqual(failed.calls,['put','blob.delete']);
 const ambiguous=memory({save:async()=>{throw failure;},find:async()=>{throw new Error('Readback unavailable');}});await assert.rejects(()=>ambiguous.service.upload(file),failure);assert.deepEqual(ambiguous.calls,['put']);
 const committed=memory();committed.io.save=async value=>{committed.records.set(value.id,value);throw failure;};const saved=await committed.service.upload(file);assert(committed.records.has(saved.id));assert.deepEqual(committed.calls,['put']);
});

test('a retained reference blocks both blob and metadata deletion; normal deletion orders them safely',async()=>{
 const retained=memory({find:async()=>asset,referenced:async()=>true});await assert.rejects(()=>retained.service.remove(asset.id),error=>error instanceof MediaOperationError&&error.status===409);assert.deepEqual(retained.calls,[]);
 const unused=memory({find:async()=>asset});await unused.service.remove(asset.id);assert.deepEqual(unused.calls,['blob.delete','record.delete']);
 const providerFailed=memory({find:async()=>asset,removeBlob:async()=>{throw Error('Provider unavailable');}});await assert.rejects(()=>providerFailed.service.remove(asset.id));assert(!providerFailed.calls.includes('record.delete'));
});
