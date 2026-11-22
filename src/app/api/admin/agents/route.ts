import {requireAdmin} from '@/lib/auth';
import {handler,ipKey,json,readJson,sameOrigin} from '@/lib/http';
import {AppError,rateLimit} from '@/lib/db';
import {agentAccess,agentEndpoint} from '@/lib/server/agents/store';
import {AgentAccessError} from '@/lib/server/agents/access';
export const runtime='nodejs';export const dynamic='force-dynamic';
const route=handler(async(request:Request)=>{if(request.method!=='GET')sameOrigin(request);await requireAdmin();if(request.method==='POST'){await rateLimit(ipKey(request,'agent-settings'),20,60);try{return json({ok:true,result:await agentAccess.admin(await readJson(request,12000),'admin')});}catch(e){if(e instanceof AgentAccessError)throw new AppError(e.message,e.status);throw e;}}return json({ok:true,result:await agentAccess.workspace(await agentEndpoint(),{configured:Boolean(process.env.CMS_AI_MODEL&&(process.env.CMS_AI_PROVIDER==='openai'&&process.env.OPENAI_API_KEY||process.env.CMS_AI_PROVIDER==='anthropic'&&process.env.ANTHROPIC_API_KEY)),provider:process.env.CMS_AI_PROVIDER||'openai',model:process.env.CMS_AI_MODEL||null})});});
export{route as GET,route as POST};
