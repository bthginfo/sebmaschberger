import {createHash,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {defaultMcpControl,mcpAdminSchema,mcpControlSchema,MCP_CAPABILITIES,type McpControl,type McpKey,type McpKeyView,type McpScope,type McpWorkspace} from '../../agents/model';

export class AgentAccessError extends Error{constructor(message:string,public status=409,public code='AGENT_REQUEST'){super(message);}}
export type AgentGrant={keyId:string;owner:string;scopes:McpScope[];control:McpControl;notAfter:string};
export type AgentAudit={id:string;keyId:string;tool:string;at:string;outcome:'success'|'rejected';code:string};
export interface AgentAccessRepository{
 ownerActive?:(id:string)=>Promise<boolean>;
 readControl:()=>Promise<McpControl|null>;
 mutateControl:(update:(previous:McpControl|null)=>McpControl)=>Promise<McpControl>;
 audit:(entry:AgentAudit)=>Promise<void>;
 lastUsage:()=>Promise<Record<string,string>>;
}
export const keyHash=(key:string)=>createHash('sha256').update('cms-agent-key-v1\0'+key).digest('hex');
const expired=(key:McpKey,at:string)=>Boolean(key.expiresAt&&Date.parse(key.expiresAt)<=Date.parse(at));
const view=(key:McpKey,control:McpControl,usage:Record<string,string>,at:string):McpKeyView=>{const {hash,requestHash,operationId,createdBy,...publicKey}=key;void hash;void requestHash;void operationId;void createdBy;return{...publicKey,lastUsedAt:usage[key.id]??null,status:key.revokedAt?'revoked':expired(key,at)?'expired':control.enabled?'active':'paused'};};
export function assertAgentGrant(control:McpControl|null,grant:AgentGrant,scope?:McpScope,at=new Date().toISOString()){
 const current=control?mcpControlSchema.parse(control):defaultMcpControl(),key=current.keys.find(k=>k.id===grant.keyId);
 if(!current.enabled||current.revision!==grant.control.revision||!key||key.revokedAt||expired(key,at)||Date.parse(grant.notAfter)<=Date.parse(at)||key.hash!==grant.control.keys.find(k=>k.id===grant.keyId)?.hash)throw new AgentAccessError('Diese Agentenfreigabe ist nicht mehr aktiv. Bitte den Schlüssel oder den gespeicherten Stand prüfen.',401,'AGENT_REVOKED');
 if(scope&&!key.scopes.includes(scope))throw new AgentAccessError('Dieser Schlüssel hat für diese Aufgabe kein Recht.',403,'AGENT_SCOPE');
 return key;
}
export function createAgentAccess(repo:AgentAccessRepository,now=()=>new Date().toISOString()){
 const read=async()=>mcpControlSchema.parse(await repo.readControl()??defaultMcpControl());
 async function workspace(endpoint:string|null,apiAssistant:McpWorkspace['apiAssistant']):Promise<McpWorkspace>{const [control,usage]=await Promise.all([read(),repo.lastUsage()]);return{enabled:control.enabled,revision:control.revision,endpoint,keys:control.keys.map(k=>view(k,control,usage,now())),apiAssistant,capabilities:MCP_CAPABILITIES};}
 async function admin(input:unknown,owner:string){
  const request=mcpAdminSchema.parse(input),at=now();
  const id=randomUUID(),secret='cmsmcp_'+id.replaceAll('-','')+'.'+randomBytes(32).toString('base64url');let created=false;
  const saved=await repo.mutateControl(previous=>{
   created=false;const current=mcpControlSchema.parse(previous??defaultMcpControl());
   if(request.action==='create'){const previous=current.keys.find(k=>k.operationId===request.operationId);if(previous){if(previous.requestHash!==keyHash(JSON.stringify(request)))throw new AgentAccessError('Diese Vorgangskennung wurde bereits für andere Angaben verwendet.');return current;}}
   if(current.revision!==request.baseRevision)throw new AgentAccessError('Die Agenten-Einstellungen wurden inzwischen geändert. Bitte neu laden.');
   if(request.action==='settings')return{...current,enabled:request.enabled,revision:current.revision+1};
   if(request.action==='revoke'){if(!current.keys.some(k=>k.id===request.id))throw new AgentAccessError('Dieser Schlüssel wurde nicht gefunden.',404);return{...current,revision:current.revision+1,keys:current.keys.map(k=>k.id===request.id?{...k,revokedAt:k.revokedAt??at}:k)};}
   if(!current.enabled)throw new AgentAccessError('Aktivieren Sie zuerst den MCP-Zugang.');
   if(current.keys.filter(k=>!k.revokedAt&&!expired(k,at)).length>=20)throw new AgentAccessError('Es sind bereits 20 aktive Schlüssel vorhanden. Widerrufen Sie zuerst einen nicht mehr benötigten.');
   created=true;const expiresAt=request.lifetime==='endless'?null:new Date(Date.parse(at)+Number(request.lifetime)*86400000).toISOString();
   const key:McpKey={id,label:request.label,prefix:'cmsmcp_'+id.slice(0,8)+'…'+secret.slice(-4),hash:keyHash(secret),requestHash:keyHash(JSON.stringify(request)),scopes:request.scopes,createdAt:at,expiresAt,revokedAt:null,createdBy:owner,operationId:request.operationId};
   const active=current.keys.filter(k=>!k.revokedAt&&!expired(k,at)),history=current.keys.filter(k=>k.revokedAt||expired(k,at)).slice(-79);
   return{...current,revision:current.revision+1,keys:[...history,...active,key]};
  });
  created=created&&saved.keys.some(k=>k.id===id&&k.hash===keyHash(secret));return{revision:saved.revision,key:request.action==='create'&&created?secret:null,replayed:request.action==='create'&&!created};
 }
 async function authenticate(header:string|null):Promise<AgentGrant>{
  const match=/^Bearer (cmsmcp_([a-f0-9]{32})\.[a-zA-Z0-9_-]{43})$/.exec(header??'');
  if(!match)throw new AgentAccessError('Ein gültiger MCP-API-Schlüssel ist erforderlich.',401,'AGENT_UNAUTHORIZED');
  const control=await read();if(!control.enabled)throw new AgentAccessError('Der MCP-Zugang ist ausgeschaltet.',404,'AGENT_DISABLED');
  const compact=match[2],id=[compact.slice(0,8),compact.slice(8,12),compact.slice(12,16),compact.slice(16,20),compact.slice(20)].join('-'),key=control.keys.find(k=>k.id===id),hash=keyHash(match[1]),at=now();
  if(!key||key.revokedAt||expired(key,at)||!timingSafeEqual(Buffer.from(key.hash),Buffer.from(hash)))throw new AgentAccessError('Der MCP-Schlüssel ist ungültig, abgelaufen oder widerrufen.',401,'AGENT_UNAUTHORIZED');
  if(repo.ownerActive&&!await repo.ownerActive(key.createdBy))throw new AgentAccessError('Der zugehörige Administrationszugang ist nicht mehr freigegeben.',401,'AGENT_OWNER');
  return{keyId:key.id,owner:key.createdBy,scopes:key.scopes,control,notAfter:new Date(Math.min(Date.parse(at)+60000,key.expiresAt?Date.parse(key.expiresAt):Infinity)).toISOString()};
 }
 async function check(grant:AgentGrant,scope?:McpScope){if(repo.ownerActive&&!await repo.ownerActive(grant.owner))throw new AgentAccessError('Der zugehörige Administrationszugang ist nicht mehr freigegeben.',401,'AGENT_OWNER');return assertAgentGrant(await read(),grant,scope,now());}
 async function audit(grant:AgentGrant,tool:string,outcome:AgentAudit['outcome'],code=''){try{await repo.audit({id:randomUUID(),keyId:grant.keyId,tool,at:now(),outcome,code:code.slice(0,80)});}catch{/* Audit failure never repeats an already committed CMS change. */}}
 return{workspace,admin,authenticate,check,audit};
}
