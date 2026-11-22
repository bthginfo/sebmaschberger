import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import fixture from '../src/data/creator-demo.json';
import type {WebsiteContent} from '../src/lib/types';
import {isolateWebsiteMedia,isolatedImage,isolatedMediaUrl,isolatedSrcSet,registerIsolatedObjectUrl,replaceImageSource} from '../src/lib/isolated-media';
import {nativeVideoSource} from '../src/lib/external-media';
import {newDemoState,saveDemoDraft,publishDemo,readDemoState} from '../src/lib/creator/demo-state';
import {EditableImage,SiteInteractionContext} from '../src/components/site/editable';
import {ExternalMedia} from '../src/components/site/consent';

test('isolated media accepts own assets and local raster uploads while rejecting external, protected and encoded paths',()=>{
  for(const url of ['https://third.invalid/a.png','//third.invalid/a.png','/api/admin/media/a.png','/admin/a.png','/assets/../api/a.png','/assets/%2e%2e/api/a.png','/assets/%252e%252e/api/a.png','/assets/a\\b.png','data:image/svg+xml;base64,AAAA','data:text/html;base64,AAAA','/assets/untrusted.svg'])assert.equal(isolatedMediaUrl(url),undefined,url);
  for(const url of ['/assets/mika/desk.webp','/media/example.jpg','/media/placeholder-landscape.svg','data:image/png;base64,AAAA'])assert.equal(isolatedMediaUrl(url),url);
  const revoke=registerIsolatedObjectUrl('blob:own-raster','image/png');assert.equal(isolatedMediaUrl('blob:own-raster'),'blob:own-raster');revoke();assert.equal(isolatedMediaUrl('blob:own-raster'),undefined);
  assert.equal(isolatedSrcSet('/assets/a.webp 600w, https://third.invalid/b.webp 1200w'),undefined);
});

test('immediate image rendering cannot request an unsafe src or srcset, while regular configured CMS media remains supported',()=>{
  const image={src:'https://third.invalid/private.png',srcSet:'https://third.invalid/private-large.png 1400w',alt:'Example',position:'50% 50%' as const};
  const render=(localMediaOnly:boolean)=>renderToStaticMarkup(createElement(SiteInteractionContext.Provider,{value:{isolated:localMediaOnly,localMediaOnly}},createElement(EditableImage,{image})));
  assert(!render(true).includes('third.invalid'));assert(render(false).includes('third.invalid'));
  assert.equal(isolatedImage({...image,src:'/assets/a.webp'})?.srcSet,undefined);
  assert.deepEqual(replaceImageSource({...image,width:900,height:700,sizes:'100vw'},'/assets/new.png'),{src:'/assets/new.png',alt:'Example',position:'50% 50%'});
});

test('draft, publication, restored state and incoming content remove unsafe images, poster, video and captions',()=>{
  const content=structuredClone(fixture) as WebsiteContent,section=content.pages[0].sections[0];
  section.content.image={src:'/api/admin/private.png',alt:'Private',position:'50% 50%'};
  section.content.images=[{src:'https://third.invalid/a.png',alt:'Remote',position:'50% 50%'}];
  section.content.videoUrl='https://third.invalid/a.mp4';
  section.content.items=[{id:'unsafe',title:'Unsafe',text:'',mediaUrl:'/admin/a.mp4',poster:{src:'https://third.invalid/poster.png',alt:'',position:'50% 50%'},tags:['captions:/api/admin/captions.vtt']}];
  const clean=isolateWebsiteMedia(content);assert(!JSON.stringify(clean).includes('third.invalid'));assert(!JSON.stringify(clean).includes('/api/admin'));assert(!JSON.stringify(clean).includes('/admin/a.mp4'));
  const saved=saveDemoDraft(newDemoState(fixture as WebsiteContent),content),published=publishDemo(saved);
  assert.deepEqual(saved.state.draft,clean);assert.deepEqual(published.state.published,clean);
  const restored=readDemoState({getItem:()=>JSON.stringify({...saved,state:{...saved.state,published:content}})},'fixture',fixture as WebsiteContent);
  assert.deepEqual(restored.state.published,clean);
});

test('remote native files and provider embeds render no player before permission; own native video still works',()=>{
  assert.deepEqual(nativeVideoSource('https://other.invalid/video.mp4','https://own.invalid'),{url:'https://other.invalid/video.mp4',external:true});
  assert.equal(nativeVideoSource('https://own.invalid/video.mp4','https://own.invalid')?.external,false);
  for(const url of ['https://third.invalid/a.mp4','https://third.invalid/a.webm','https://www.youtube.com/watch?v=abcdef12345','https://vimeo.com/123456']){
    const html=renderToStaticMarkup(createElement(ExternalMedia,{kind:'video',url,title:'Example'}));assert(!html.includes('<video'));assert(!html.includes('<iframe'));
  }
  assert(renderToStaticMarkup(createElement(ExternalMedia,{kind:'video',url:'/assets/example.mp4',title:'Own video'})).includes('<video'));
});
