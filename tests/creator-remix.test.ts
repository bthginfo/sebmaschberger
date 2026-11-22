import test from 'node:test';
import assert from 'node:assert/strict';
import { createSection, availableSectionLibrary } from '../src/lib/section-library';
import { sectionSchema, websiteSchema, inquirySchema } from '../src/lib/validation';
import { createRemixContent, remixInquiryHref, remixMessage, selectedRemixModules } from '../src/lib/creator/remix';
import { readContactContext } from '../src/lib/contact-context';
import { sectionCapabilities } from '../src/components/admin/section-capabilities';
import seed from '../src/data/content.json';
import type { WebsiteContent } from '../src/lib/types';

test('a reusable remix is fully editable, schema-backed and remains opt in', () => {
  const section=createSection('creator-remix');
  assert.equal(sectionSchema.safeParse(section).success,true);
  assert.equal(availableSectionLibrary().some(item=>item.type==='creator-remix'),false);
  assert.equal(sectionCapabilities('creator-remix').items,true);
  assert.equal(sectionCapabilities('creator-remix').itemImages,true);
  const content=structuredClone(seed) as WebsiteContent;
  delete content.config.modules;
  content.pages[0].sections.push(section);
  assert.equal(websiteSchema.safeParse(content).success,false);
});

test('the chosen modules become the actual editable contact message, including when all are removed', () => {
  const content=createRemixContent(),items=content.items!;
  const message=remixMessage(items,['shop','kit'],'Meine Wunsch-Website:','Meine Idee:');
  const href=remixInquiryHref('/kontakt?quelle=remix#formular','Mein Mix',message)!;
  const url=new URL(href,'https://example.invalid');
  const context=readContactContext(url.search);
  assert.equal(url.hash,'#formular');
  assert.equal(url.searchParams.get('quelle'),'remix');
  assert.equal(context.subject,'Mein Mix');
  assert.match(context.message,/Shop & Drops/);
  assert.match(context.message,/Media Kit & Kooperationen/);
  assert.doesNotMatch(context.message,/Content & Videos/);
  assert.equal(inquirySchema.safeParse({name:'Beispiel',email:'beispiel@example.invalid',phone:'',...context,consent:true}).success,true);
  assert.deepEqual(selectedRemixModules(items,[]),[]);
  const invalid=structuredClone(createSection('creator-remix'));
  invalid.content.items![4].remixSelection=['shop','shop'];
  assert.equal(sectionSchema.safeParse(invalid).success,false);
  assert.equal(readContactContext('?message='+ 'x'.repeat(15000)).message.length,12000);
});
