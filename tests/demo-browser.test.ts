import test from 'node:test';
import assert from 'node:assert/strict';
import fixture from '../src/data/creator-demo.json';
import type {WebsiteContent} from '../src/lib/types';
import {demoStorageKey} from '../src/lib/creator/demo-state';
import {demoBrowserPath,isDemoFrameMessage} from '../src/lib/creator/demo-browser';

test('fixture versions renew old demo drafts while all current views use one stable key',()=>{
  const initial=fixture as WebsiteContent;
  const same=JSON.parse(JSON.stringify(initial)) as WebsiteContent;
  assert.equal(demoStorageKey(initial),demoStorageKey(same));
  const next=structuredClone(initial);next.pages[0].sections[0].content.heading+=' Updated fixture';
  assert.notEqual(demoStorageKey(initial),demoStorageKey(next));
  assert(demoStorageKey(initial).startsWith('ws-creator-demo-v2:'));
});

test('iframe routing stays in the selected same-origin public demo',()=>{
  const origin='https://studio.example',base='/demo/creator';
  assert.equal(demoBrowserPath('/demo/creator/shop?size=M#details',base,origin),'/demo/creator/shop?size=M#details');
  assert.equal(demoBrowserPath(origin+base,base,origin),base);
  for(const href of ['/websites','/admin','/api/admin/content','/demo/creator-other','https://other.example/demo/creator','https://user:password@studio.example/demo/creator','javascript:alert(1)'])assert.equal(demoBrowserPath(href,base,origin),null,href);
});

test('cross-document messages require the exact iframe, origin and fixture version',()=>{
  const frame={} as Window;
  const other={} as Window;
  const event={origin:'https://studio.example',source:frame,data:{type:'ws:demo-location',key:'version-a'}};
  assert(isDemoFrameMessage(event,frame,'https://studio.example','version-a'));
  assert(!isDemoFrameMessage({...event,source:other},frame,event.origin,'version-a'));
  assert(!isDemoFrameMessage({...event,origin:'https://other.example'},frame,event.origin,'version-a'));
  assert(!isDemoFrameMessage({...event,data:{...event.data,key:'old-version'}},frame,event.origin,'version-a'));
});
