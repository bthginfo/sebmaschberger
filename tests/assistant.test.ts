import test from 'node:test';
import assert from 'node:assert/strict';
import {MockLanguageModelV4} from 'ai/test';
import {assistantProposalSchema,assistantRequestSchema,mockAssistantProposal,type AssistantRequest} from '../src/lib/assistant/model';
import {assistantConfiguration,assistantStatus,configuredAssistant,generateAssistantProposal,AssistantServiceError} from '../src/lib/server/assistant/operations';

const request:AssistantRequest={kind:'rewrite',prompt:'Bitte kürzer und verständlicher formulieren.',context:{brandName:'Beispielbetrieb',pageTitle:'Start',text:'Wir unterstützen unsere Kunden bei ihrem Vorhaben.'}};
function fixture(value:unknown,onCall?:(input:unknown)=>void){return new MockLanguageModelV4({doGenerate:async input=>{onCall?.(input);return{content:[{type:'text' as const,text:JSON.stringify(value)}],finishReason:{unified:'stop' as const,raw:undefined},usage:{inputTokens:{total:10,noCache:10,cacheRead:undefined,cacheWrite:undefined},outputTokens:{total:20,text:20,reasoning:undefined}},warnings:[]};}});}

test('assistant is unconfigured without explicit own provider, model and key, even with gateway credentials',()=>{
 assert.equal(assistantConfiguration({AI_GATEWAY_API_KEY:'fixture-gateway',VERCEL_OIDC_TOKEN:'fixture-oidc'}),null);
 for(const env of [{CMS_AI_PROVIDER:'openai',CMS_AI_MODEL:'fixture-model'},{CMS_AI_PROVIDER:'unsupported',CMS_AI_MODEL:'fixture-model',OPENAI_API_KEY:'fixture-key'},{CMS_AI_PROVIDER:'openai',CMS_AI_MODEL:'https://outside.invalid/model?key=x',OPENAI_API_KEY:'fixture-key'}])assert.equal(assistantConfiguration(env),null);
 assert.throws(()=>configuredAssistant({}),error=>error instanceof AssistantServiceError&&error.status===503);
});

test('status contains no credentials and each adapter selects only its own key',()=>{
 const env={CMS_AI_PROVIDER:'openai',CMS_AI_MODEL:'fixture-model',OPENAI_API_KEY:'openai-fixture-secret',ANTHROPIC_API_KEY:'anthropic-fixture-secret'};
 assert.equal(configuredAssistant(env).apiKey,env.OPENAI_API_KEY);
 assert.deepEqual(assistantStatus(env),{configured:true,provider:'openai',model:'fixture-model'});
 assert(!JSON.stringify(assistantStatus(env)).includes('fixture-secret'));
 assert.equal(configuredAssistant({...env,CMS_AI_PROVIDER:'anthropic'}).apiKey,env.ANTHROPIC_API_KEY);
});

test('real SDK structured-output path validates suggestions without network, tools or document writes',async()=>{
 const proposal={kind:'rewrite',title:'Klarer Einstieg',summary:'Ein kurzer Formulierungsvorschlag.',text:'Wir helfen Ihnen, Ihr Vorhaben umzusetzen.'};
 let calls=0;const model=fixture({proposal},input=>{calls++;const options=input as {responseFormat?:{type:string};tools?:unknown[]};assert.equal(options.responseFormat?.type,'json');assert.equal(options.tools?.length??0,0);});
 const before=structuredClone(request),result=await generateAssistantProposal(request,model);assert.deepEqual(result,proposal);assert.deepEqual(request,before);assert.equal(calls,1);
});

test('invalid requests do not reach the model; wrong-kind or unsafe provider output is rejected',async()=>{
 let calls=0;const model=fixture({proposal:{kind:'ideas',title:'Ideen',summary:'Vorschläge',ideas:['Einblick in die Arbeit']}},()=>{calls++;});
 await assert.rejects(()=>generateAssistantProposal({...request,prompt:'<script>execute()</script>'},model));assert.equal(calls,0);
 await assert.rejects(()=>generateAssistantProposal(request,model),error=>error instanceof AssistantServiceError&&error.status===502);assert.equal(calls,1);
 await assert.rejects(()=>generateAssistantProposal(request,fixture({proposal:{kind:'rewrite',title:'Titel',summary:'Text',text:'<img src=x onerror=alert(1)>'}})));
});

test('public demo proposals are deterministic local data and never present an actual connection',()=>{
 for(const kind of ['rewrite','social','ideas'] as const){const input={...request,kind};const a=mockAssistantProposal(input),b=mockAssistantProposal(input);assert.deepEqual(a,b);assert(assistantProposalSchema.safeParse(a).success);assert.equal(a.kind,kind);assert(!('mode'in a));}
 assert(!assistantRequestSchema.safeParse({...request,context:{...request.context,apiKey:'not-a-client-field'}}).success);
 assert(!assistantRequestSchema.safeParse({...request,prompt:'a'.repeat(1501)}).success);
});
