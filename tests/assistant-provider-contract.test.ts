import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpenAI} from '@ai-sdk/openai';
import {createAnthropic} from '@ai-sdk/anthropic';
import {generateAssistantProposal} from '../src/lib/server/assistant/operations';
import type {AssistantRequest} from '../src/lib/assistant/model';

const request:AssistantRequest={kind:'page',prompt:'Eine neue Seite aus vorhandenen Textabschnitten.',context:{brandName:'Eigener Betrieb',availableSections:[{type:'hero',label:'Einstieg'},{type:'richtext',label:'Text'}],pageList:[],draftToken:'must-never-reach-provider'}};
const proposal={kind:'page',title:'Eine eigene Seite',summary:'Ein Vorschlag zur Prüfung.',page:{title:'Eigene Seite',slug:'eigene-seite',description:'Eigene Angaben',sections:[{type:'hero',heading:'Eigener Einstieg',text:'Eigene Angaben',items:[]},{type:'richtext',heading:'Mehr erfahren',text:'Weitere eigene Angaben',items:[]}]}};
function strictObjects(schema:unknown,path='$'){
 if(!schema||typeof schema!=='object')return;
 const value=schema as Record<string,unknown>;
 assert(!('oneOf' in value),'Provider supports anyOf rather than oneOf: '+path);
 if(value.properties&&typeof value.properties==='object'){
  assert.deepEqual([...(value.required as string[]??[])].sort(),Object.keys(value.properties).sort(),'Provider requires all object fields: '+path);
  assert.equal(value.additionalProperties,false,path);
 }
 for(const[key,child]of Object.entries(value))if(Array.isArray(child))child.forEach((item,index)=>strictObjects(item,path+'.'+key+'['+index+']'));else if(child&&typeof child==='object')strictObjects(child,path+'.'+key);
}

test('actual OpenAI Responses adapter sends a valid strict schema, disables storage and parses a page',async()=>{
 let captured:Record<string,any>|undefined,calls=0;
 const model=createOpenAI({apiKey:'local-contract-fixture',fetch:async(_url,init)=>{
  calls++;captured=JSON.parse(String(init?.body));
  return new Response(JSON.stringify({id:'resp_fixture',object:'response',created_at:1793600000,status:'completed',model:'fixture-model',output:[{id:'msg_fixture',type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify({proposal}),annotations:[]}]}],usage:{input_tokens:10,output_tokens:20,total_tokens:30}}),{headers:{'Content-Type':'application/json'}});
 }}).responses('fixture-model');
 const result=await generateAssistantProposal(request,model,undefined,'openai');
 assert.equal(calls,1);assert.deepEqual(result,proposal);assert.equal(captured!.store,false);
 assert.equal(captured!.text.format.type,'json_schema');assert.equal(captured!.text.format.strict,true);
 strictObjects(captured!.text.format.schema);assert(!JSON.stringify(captured).includes('must-never-reach-provider'));
 assert(!captured!.tools?.length);
});

test('actual Anthropic Messages adapter parses the same page without action tools or draft credentials',async()=>{
 let captured:Record<string,any>|undefined,calls=0;
 const model=createAnthropic({apiKey:'local-contract-fixture',fetch:async(_url,init)=>{
  calls++;captured=JSON.parse(String(init?.body));
  return new Response(JSON.stringify({id:'msg_fixture',type:'message',role:'assistant',model:'fixture-model',content:[{type:'tool_use',id:'toolu_fixture',name:'json',input:{proposal}}],stop_reason:'tool_use',stop_sequence:null,usage:{input_tokens:10,output_tokens:20}}),{headers:{'Content-Type':'application/json'}});
 }}).messages('fixture-model');
 const result=await generateAssistantProposal(request,model,undefined,'anthropic');
 assert.equal(calls,1);assert.deepEqual(result,proposal);
 assert(!JSON.stringify(captured).includes('must-never-reach-provider'));assert(captured!.tools?.every((tool:{name:string})=>tool.name==='json'));
});
