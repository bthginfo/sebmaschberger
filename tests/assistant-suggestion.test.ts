import test from 'node:test';
import assert from 'node:assert/strict';
import {socialProjectFromSuggestion} from '../src/lib/social/assistant';
import {projectSchema,type SocialBrandProfile} from '../src/lib/social/model';
import {assistantRequestSchema,assistantProposalSchema,mockAssistantProposal} from '../src/lib/assistant/model';

test('assistant proposals create separate editable Social documents and preserve the private brand snapshot',()=>{
 const brand:SocialBrandProfile={name:'Eigene Marke',website:'https://example.org',accent:'#c8e37e',ink:'#142b27',paper:'#fffefa',headlineFont:'manrope',bodyFont:'dm-sans'};
 const before=structuredClone(brand),post={headline:'Ein langer eigener Titel '.repeat(8).slice(0,180),body:'Eigene Angaben zum vorgeschlagenen Beitrag. '.repeat(30).slice(0,1200),caption:'Eine eigene Caption.'};
 const first=projectSchema.parse(socialProjectFromSuggestion(brand,post)),second=socialProjectFromSuggestion(brand,post);
 assert.notEqual(first.id,second.id);assert.equal(first.kind,'post');assert.equal(first.caption,post.caption);assert.deepEqual(brand,before);
 brand.name='Spaeter geaendert';assert.equal(first.brand.name,'Eigene Marke');
 assert(first.slides[0].elements.some(element=>element.type==='text'&&element.text===post.headline));
 assert(first.slides[0].elements.some(element=>element.type==='text'&&element.text===post.body));
});

test('the explicit public mock emits validated proposals without company-name assumptions',()=>{
 for(const kind of ['rewrite','social','ideas'] as const){
  const request=assistantRequestSchema.parse({kind,prompt:'Ein konkreter Vorschlag.',context:{brandName:'Eigene Marke',heading:'Ein eigener Abschnitt',text:'Vorhandene eigene Inhalte.'}});
  const proposal=assistantProposalSchema.parse(mockAssistantProposal(request));assert.equal(proposal.kind,kind);
  assert.equal(JSON.stringify(proposal).includes('Auenholz'),false);assert.equal(JSON.stringify(proposal).includes('Kantiq'),false);
 }
});
