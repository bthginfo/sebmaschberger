import test from 'node:test';
import assert from 'node:assert/strict';
import {searchReadinessIssues} from '../src/lib/search-readiness.mjs';
import {findSettingAreas} from '../src/lib/admin-settings-search';
import {normalizeBrief} from '../scripts/lib/scaffold.mjs';

test('public SEO hints ignore private and draft material, and identify duplicates by URL',()=>{
 const pages=[
  {title:'Home',slug:'',seo:{title:'Home',description:'A useful introduction'}},
  {title:'Offer',slug:'offer',seo:{title:' HOME ',description:''}},
  {title:'Hidden',slug:'hidden',seo:{noindex:true}}
 ];
 const notes=searchReadinessIssues({pages,config:{blog:{enabled:true,slug:'journal'}},posts:[
  {title:'Draft',slug:'draft',status:'draft'},
  {title:'Published',slug:'feature',status:'published',seo:{title:'Feature',description:'A useful introduction'}}
 ]});
 assert.equal(notes.length,3);
 assert(notes.some(note=>note.includes('/offer')&&note.includes('Meta-Beschreibung')));
 assert(notes.some(note=>note.includes('/journal/feature')&&note.includes('auch für /')));
 assert(!notes.some(note=>note.includes('Hidden')||note.includes('Draft')));
});
test('settings search finds equivalent words in the allowed areas',()=>{
 const allowed=[{id:'contact',title:'Contact and hours'},{id:'email',title:'Email delivery'}];
 assert.equal(findSettingAreas(allowed,'öffnungszeiten')[0].id,'contact');
 assert.equal(findSettingAreas(allowed,'SMTP')[0].id,'email');
 assert.deepEqual(findSettingAreas(allowed,'Passwort'),[]);
});
test('the generated brief keeps writing voice, target search and checked evidence',()=>{
 const brief=normalizeBrief({projectName:'A Studio',voice:' Ich ',searchAudience:'Local customers',verifiedProof:[' Material ', '']});
 assert.equal(brief.voice,'Ich');assert.equal(brief.searchAudience,'Local customers');
 assert.deepEqual(brief.verifiedProof,['Material']);
});
