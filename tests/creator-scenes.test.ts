import test from 'node:test';
import assert from 'node:assert/strict';
import { availableSectionLibrary,createSection } from '../src/lib/section-library';
import { sectionSchema,websiteSchema } from '../src/lib/validation';
import { lensPreset } from '../src/lib/creator/scenes';
import { projectPublicContent } from '../src/lib/public-projection';
import { sectionCapabilities } from '../src/components/admin/section-capabilities';
import starter from './fixtures/starter-content.json';
import type { WebsiteContent } from '../src/lib/types';

test('new creator scenes keep normal profiles opt out and persist actual editable lens presets',()=>{
  const standard=availableSectionLibrary();
  assert(standard.some(section=>section.type==='assistant-showcase'));
  assert(standard.every(section=>!section.type.startsWith('creator-')));
  const assistant=createSection('assistant-showcase');
  assert.equal(sectionSchema.safeParse(assistant).success,true);
  assert.equal(sectionCapabilities(assistant.type).items,true);
  const neutralContent=structuredClone(starter) as WebsiteContent;
  neutralContent.pages[0].sections.push(assistant);
  assert.equal(websiteSchema.safeParse(neutralContent).success,true);
  const lens=createSection('creator-lens'),orbit=createSection('creator-orbit');
  assert.equal(sectionSchema.safeParse(lens).success,true);
  assert.equal(sectionSchema.safeParse(orbit).success,true);
  assert.equal(sectionCapabilities('creator-lens').image,true);
  assert.equal(sectionCapabilities('creator-orbit').itemImages,true);
  const site=structuredClone(starter) as WebsiteContent;
  site.pages[0].sections.push(lens,orbit);
  assert.equal(websiteSchema.safeParse(site).success,false);
  site.config.modules={creator:{enabled:true,surface:'marketing',demoBasePath:'/demo/example'}};
  lens.content.items![0].lens={x:16,y:78,radius:38};
  const published=projectPublicContent(websiteSchema.parse(site),'');
  assert.deepEqual(published.pages[0].sections.find(section=>section.id===lens.id)?.content.items?.[0].lens,{x:16,y:78,radius:38});
  lens.content.items![0].lens.radius=101;
  assert.equal(sectionSchema.safeParse(lens).success,false);
});

test('lens state bounds damaged local/editor values before using CSS coordinates',()=>{
  assert.deepEqual(lensPreset(),{x:50,y:50,radius:25});
  assert.deepEqual(lensPreset({lens:{x:-50,y:220,radius:0}}),{x:0,y:100,radius:8});
  assert.deepEqual(lensPreset({lens:{x:NaN,y:Infinity,radius:Infinity}}),{x:50,y:50,radius:25});
});
