import {agentHelp} from './help';
import 'server-only';
import {createHash} from 'node:crypto';
import {AppError,commitAgentOperation,moduleLastUsage,pruneModuleRecords,getRecord,getSettings,getState,listRecords,mutateRecord,setRecord} from '@/lib/db';
import {defaultAnalyticsFilters} from '@/lib/analytics/model';
import {defaultMcpControl,type McpControl} from '@/lib/agents/model';
import {agentTextTargets,patchAgentText} from '@/lib/agents/text';
import {applyAssistantPagePlan,assistantSectionCatalog} from '@/lib/assistant/pages';
import {socialProjectFromSuggestion} from '@/lib/social/assistant';
import {websiteSchema} from '@/lib/validation';
import {analytics} from '../analytics/store';
import {readSocialBrand,requireSocialEnabled,assertSocialSources} from '../social/store';
import {emptyProject,saveProjectState} from '../social/state';
import {createAgentAccess,AgentAccessError,type AgentGrant,type AgentAudit} from './access';
import type {AgentToolAdapter} from './transport';
export const agentAccess=createAgentAccess({readControl:()=>getRecord<McpControl>('mcp-control','main'),mutateControl:update=>mutateRecord('mcp-control','main',defaultMcpControl(),p=>update(p)),audit:entry=>setRecord('mcp-audit',entry.id,entry),lastUsage:()=>moduleLastUsage('mcp-audit')});
const guard=(g:AgentGrant)=>({collection:'mcp-control',id:'main',expected:g.control,notAfter:g.notAfter});
function operation(g:AgentGrant,name:string,input:{operationId:string}){return{guard:guard(g),receiptId:g.keyId+':'+input.operationId,hash:createHash('sha256').update(name+'\0'+JSON.stringify(input)).digest('hex')};}
async function replay(g:AgentGrant,name:string,input:{operationId:string}){const op=operation(g,name,input),previous=await getRecord<{hash:string;result:Record<string,unknown>}>('mcp-operations',op.receiptId);if(previous){if(previous.hash!==op.hash)throw new AgentAccessError('Diese Vorgangskennung wurde bereits für andere Angaben verwendet.');return previous.result;}return null;}
async function pageSelection(pageId:string,sectionId?:string){const state=await getState(),page=state.draft.pages.find(p=>p.id===pageId);if(!page)throw new AppError('Diese Seite wurde nicht gefunden.',404);const section=sectionId?page.sections.find(s=>s.id===sectionId):undefined;if(sectionId&&!section)throw new AppError('Dieser Abschnitt wurde nicht gefunden.',404);return{state,page,section};}
export const agentTools:AgentToolAdapter={
 workspace:async()=>{const state=await getState();return{revision:state.revision,name:state.draft.config.name,pages:state.draft.pages.map(p=>({id:p.id,title:p.title,slug:p.slug,sections:p.sections.map(s=>({id:s.id,type:s.type,name:s.name}))})),sectionLibrary:assistantSectionCatalog(state.draft),modules:{social:Boolean(state.draft.config.modules?.socialStudio?.enabled),shop:Boolean(state.draft.config.modules?.commerce?.enabled)},writes:'Entwürfe; Veröffentlichung erfolgt separat im CMS.'};},
 page:async(_g,input)=>{const{state,page,section}=await pageSelection(input.pageId,input.sectionId);return{revision:state.revision,page:{id:page.id,title:page.title,slug:page.slug},sections:(section?[section]:page.sections).map(s=>({id:s.id,type:s.type,fields:agentTextTargets(s.content)}))};},
 help:async(_g,{topic,question})=>agentHelp(topic,question,true),
 updateText:async(g,input)=>{const previous=await replay(g,'text',input);if(previous)return previous;const{state,page,section}=await pageSelection(input.pageId,input.sectionId);if(state.revision!==input.baseRevision)throw new AppError('Der Entwurf wurde inzwischen geändert. Bitte erneut lesen.',409);const updated=patchAgentText(section!.content,input),content={...state.draft,pages:state.draft.pages.map(p=>p.id===page.id?{...p,sections:p.sections.map(s=>s.id===section!.id?{...s,content:updated}:s)}:p)};websiteSchema.parse(content);return commitAgentOperation({...operation(g,'text',input),draft:{content,revision:input.baseRevision},result:{revision:input.baseRevision+1,pageId:page.id,sectionId:section!.id,saved:'draft'}});},
 createPage:async(g,input)=>{const previous=await replay(g,'page',input);if(previous)return previous;const state=await getState();if(state.revision!==input.baseRevision)throw new AppError('Der Entwurf wurde inzwischen geändert. Bitte erneut lesen.',409);const next=applyAssistantPagePlan(state.draft,input.page,'mcp','mcp');return commitAgentOperation({...operation(g,'page',input),draft:{content:next.content,revision:input.baseRevision},result:{revision:input.baseRevision+1,pageId:next.page.id,slug:next.page.slug,saved:'draft'}});},
 createSocial:async(g,input)=>{const previous=await replay(g,'social',input);if(previous)return previous;const config=await requireSocialEnabled(),{brand}=await readSocialBrand(config);if(input.brand&&input.brand!==brand.name)throw new AppError('Bitte den Namen der verfügbaren Marke verwenden.');const project=socialProjectFromSuggestion(brand,input);const compact=createHash('sha256').update(g.keyId+':'+input.operationId).digest('hex');project.id=[compact.slice(0,8),compact.slice(8,12),'4'+compact.slice(13,16),'a'+compact.slice(17,20),compact.slice(20,32)].join('-');await assertSocialSources(project);const data=saveProjectState(emptyProject(),{project,baseRevision:0,idempotencyKey:project.id},new Date().toISOString());return commitAgentOperation({...operation(g,'social',input),record:{collection:'social-projects',id:project.id,data},result:{id:project.id,revision:1,title:project.title,saved:'draft',published:false}});},
 analytics:async(_g,input)=>analytics.report({...defaultAnalyticsFilters(),...input} as ReturnType<typeof defaultAnalyticsFilters>)
};
export async function agentEndpoint(){return new URL('/api/mcp',(await getSettings()).siteUrl).href;}

export const cleanupAgentAudit=()=>pruneModuleRecords('mcp-audit',new Date(Date.now()-90*86400000).toISOString(),'at');
