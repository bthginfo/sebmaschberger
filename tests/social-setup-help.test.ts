import test from 'node:test';
import assert from 'node:assert/strict';
import {assistantRequestSchema,assistantProposalSchema} from '../src/lib/assistant/model';
import {CONNECTOR_PROVIDERS} from '../src/lib/social/connectors/model';
import {connectionHelpProposal,connectionHelpSchema} from '../src/lib/social/connectors/setup-assistant';
import {guidedAssistantHelp} from '../src/lib/server/assistant/help';

test('setup assistance accepts only a public platform and step, never credentials or account claims',()=>{
 const context={brandName:'Eigene Website',helpTopic:'social' as const,connectionHelp:{platform:'instagram' as const,step:'app' as const}};
 assert(assistantRequestSchema.safeParse({kind:'help',prompt:'Was ist als Nächstes nötig?',context}).success);
 for(const forbidden of [{clientSecret:'private-value'},{accessToken:'private-value'},{connected:true}])assert(!connectionHelpSchema.safeParse({...context.connectionHelp,...forbidden}).success);
 assert(!connectionHelpSchema.safeParse({platform:'unknown',step:'app'}).success);
 assert(!connectionHelpSchema.safeParse({platform:'instagram',step:'publish'}).success);
});

test('all eight channels have valid step assistance that offers no connection or publishing action',()=>{
 for(const platform of CONNECTOR_PROVIDERS)for(const step of ['app','account','target','connected'] as const){
  const proposal=connectionHelpProposal({platform,step});
  assert(assistantProposalSchema.safeParse(proposal).success,platform+' '+step);
  assert.deepEqual(proposal.actions,[]);
  assert(proposal.answer.length>250);
 }
 const app=connectionHelpProposal({platform:'instagram',step:'app'});
 assert(app.answer.includes('Rücksprungadresse'));assert(app.answer.includes('niemals in diesen Chat'));
 const tiktok=connectionHelpProposal({platform:'tiktok',step:'account'});
 assert(tiktok.answer.includes('TikTok-Posteingang'));assert(tiktok.answer.includes('Veröffentlichung in TikTok'));
 const connected=connectionHelpProposal({platform:'instagram',step:'connected'});
 assert(connected.answer.includes('keine neue Prüfung beim Anbieter'));
});

test('server-side setup explanations keep module boundaries and do not invent a connected account',()=>{
 const request=assistantRequestSchema.parse({kind:'help',prompt:'Bitte einfach erklären.',context:{brandName:'Eigene Website',helpTopic:'social',connectionHelp:{platform:'instagram',step:'app'}}});
 const disabled=guidedAssistantHelp(request,{social:{available:true,studioEnabled:false,plannerEnabled:false,storedConnected:0,storedExpired:0}});
 assert(disabled.answer.includes('noch nicht beide'));
 const enabled=guidedAssistantHelp(request,{social:{available:true,studioEnabled:true,plannerEnabled:true,storedConnected:0,storedExpired:0}});
 assert(enabled.answer.includes('App-Daten gespeichert heißt noch nicht Konto verbunden'));
 assert.deepEqual(enabled.actions,[]);
});
