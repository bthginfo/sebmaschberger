import {z} from 'zod';

export const MCP_SCOPES=['cms:read','cms:draft','social:draft','analytics:read'] as const;
export type McpScope=typeof MCP_SCOPES[number];
export const MCP_SCOPE_LABELS:Record<McpScope,string>={'cms:read':'Website und CMS-Status lesen','cms:draft':'Website-Entwürfe bearbeiten','social:draft':'Neue Social-Entwürfe anlegen','analytics:read':'Webanalyse lesen'};
export const MCP_LIFETIMES=['1','7','30','90','180','365','endless'] as const;
export type McpLifetime=typeof MCP_LIFETIMES[number];
export const mcpScopesSchema=z.array(z.enum(MCP_SCOPES)).min(1).max(4).refine(value=>new Set(value).size===value.length&&value.includes('cms:read'),'Leserechte sind erforderlich; Rechte bitte nur einmal wählen.');
export const mcpKeySchema=z.object({id:z.uuid(),label:z.string().trim().min(1).max(80),prefix:z.string().max(32),hash:z.string().regex(/^[a-f0-9]{64}$/),requestHash:z.string().regex(/^[a-f0-9]{64}$/),scopes:mcpScopesSchema,createdAt:z.iso.datetime(),expiresAt:z.iso.datetime().nullable(),revokedAt:z.iso.datetime().nullable(),createdBy:z.string().min(1).max(120),operationId:z.uuid()}).strict();
export const mcpControlSchema=z.object({revision:z.number().int().nonnegative(),enabled:z.boolean(),keys:z.array(mcpKeySchema).max(100)}).strict();
export type McpKey=z.infer<typeof mcpKeySchema>;
export type McpControl=z.infer<typeof mcpControlSchema>;
export type McpKeyView=Omit<McpKey,'hash'|'requestHash'|'operationId'|'createdBy'>&{lastUsedAt:string|null;status:'active'|'expired'|'revoked'|'paused'};
export type McpWorkspace={enabled:boolean;revision:number;endpoint:string|null;keys:McpKeyView[];apiAssistant:{configured:boolean;provider:string|null;model:string|null};capabilities:string[]};
export const defaultMcpControl=():McpControl=>({revision:0,enabled:false,keys:[]});
const base={baseRevision:z.number().int().nonnegative()};
export const mcpAdminSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('settings'),...base,enabled:z.boolean()}).strict(),
 z.object({action:z.literal('create'),...base,operationId:z.uuid(),label:z.string().trim().min(1).max(80),lifetime:z.enum(MCP_LIFETIMES),scopes:mcpScopesSchema}).strict(),
 z.object({action:z.literal('revoke'),...base,id:z.uuid()}).strict()
]);
export const mcpOperationId=z.string().min(8).max(100).regex(/^[a-zA-Z0-9_-]+$/,'Eine stabile eigene Vorgangskennung verwenden.');
export const plainAgentText=(max:number)=>z.string().max(max).refine(value=>!/<\/?[a-z][^>]*>/i.test(value),'Nur Text ohne HTML verwenden.');
export const agentTextPatchSchema=z.object({operationId:mcpOperationId,baseRevision:z.number().int().positive(),pageId:z.string().min(1).max(120),sectionId:z.string().min(1).max(120),path:z.array(z.union([z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/).max(80),z.number().int().min(0).max(999)])).min(1).max(6),previousText:z.string().max(8000),text:plainAgentText(8000)}).strict();
export type AgentTextPatch=z.infer<typeof agentTextPatchSchema>;
export const MCP_CAPABILITIES=['Website-Inhalte und verfügbare Abschnitte lesen','Texte in einem versionierten Website-Entwurf ändern','Neue Seiten aus vorhandenen Abschnitten vorbereiten','Neue bearbeitbare Social-Entwürfe anlegen','CMS-Bedienung und gespeicherten Einrichtungsstand erklären','Webanalyse mit erteiltem Leserecht auswerten'];
export function mcpConnectionExample(endpoint:string){return JSON.stringify({mcpServers:{'mein-cms':{type:'http',url:endpoint,headers:{Authorization:'Bearer ${CMS_MCP_API_KEY}'}}}},null,2);}
