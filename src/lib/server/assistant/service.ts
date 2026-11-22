import 'server-only';
import {createOpenAI} from '@ai-sdk/openai';
import {createAnthropic} from '@ai-sdk/anthropic';
import {AppError,getDraftConfig,getRecord,getState,listInquiries,listRecords} from '@/lib/db';
import {assistantRequestSchema} from '@/lib/assistant/model';
import {allowedAssistantSectionCatalog} from '@/lib/assistant/catalog';
import type {SiteConfig} from '@/lib/types';
import {assistantHelpTopic,guidedAssistantHelp,summarizeAssistantInquiries,type AssistantHelpFacts} from './help';
import {AssistantServiceError,assistantStatus,configuredAssistant,generateAssistantProposal} from './operations';

export async function requireAssistantEnabled(){
 const config=await getDraftConfig();if(config.modules?.aiAssistant?.enabled!==true)throw new AppError('Der KI-Assistent ist für diese Website nicht aktiviert. Aktivieren und speichern Sie ihn unter Einstellungen.',403);
}
export function loadAssistantStatus(){return{...assistantStatus(process.env),guidedHelp:true};}

async function helpFacts(topic:ReturnType<typeof assistantHelpTopic>,config:SiteConfig):Promise<AssistantHelpFacts>{
 if(topic==='inquiries'){
  return{inquiries:summarizeAssistantInquiries(await listInquiries())};
 }
 if(topic==='shop'){
  const store=await getRecord<{orders?:{status:string;fulfillment:string}[]}>('commerce','state'),products=config.modules?.commerce?.products??[];
  return{shop:{enabled:config.modules?.commerce?.enabled===true,products:products.length,activeProducts:products.filter(product=>product.active).length,orders:store?.orders?.length??0,unfulfilledPaid:store?.orders?.filter(order=>order.status==='paid'&&order.fulfillment==='pending').length??0,paymentCredentials:Boolean(process.env.STRIPE_SECRET_KEY?.trim()&&process.env.STRIPE_WEBHOOK_SECRET?.trim()),paymentsEnabled:process.env.COMMERCE_CHECKOUT_ENABLED==='1'}};
 }
 if(topic==='social'){
  const modules=config.modules as {socialStudio?:{enabled:boolean};socialPublishing?:{enabled:boolean}}|undefined;
  const nativePublishingAvailable=true;
  if(!nativePublishingAvailable||!modules?.socialStudio?.enabled||!modules?.socialPublishing?.enabled)return{social:{available:nativePublishingAvailable,studioEnabled:modules?.socialStudio?.enabled===true,plannerEnabled:modules?.socialPublishing?.enabled===true,storedConnected:0,storedExpired:0}};
  const [native,instagram]=await Promise.all([listRecords<{view:{status:string;expiresAt?:string|null}}>('social-connector-accounts'),listRecords<{view:{status:string;expiresAt?:string|null}}>('social-publishing-connections')]);
  const views=[...native,...instagram].map(record=>record.view),expired=(view:typeof views[number])=>view.status==='expired'||view.status==='connected'&&Boolean(view.expiresAt)&&Date.parse(view.expiresAt!)<=Date.now();
  return{social:{available:true,studioEnabled:true,plannerEnabled:true,storedConnected:views.filter(view=>view.status==='connected'&&!expired(view)).length,storedExpired:views.filter(expired).length}};
 }
 return{pageCount:(await getState()).draft.pages.length};
}
export async function createAssistantProposal(input:unknown,signal?:AbortSignal){
 const parsed=assistantRequestSchema.parse(input),siteConfig=await getDraftConfig();
 if(parsed.kind==='help')return{mode:'guided' as const,proposal:guidedAssistantHelp(parsed,await helpFacts(assistantHelpTopic(parsed),siteConfig))};
 const request=assistantRequestSchema.parse({...parsed,context:{...parsed.context,brandName:siteConfig.name,availableSections:allowedAssistantSectionCatalog(siteConfig)}});
 try{
  const config=configuredAssistant(process.env);
  const model=config.provider==='openai'?createOpenAI({apiKey:config.apiKey}).responses(config.model):createAnthropic({apiKey:config.apiKey}).messages(config.model);
  return{mode:'connected' as const,proposal:await generateAssistantProposal(request,model,signal,config.provider)};
 }catch(error){
  if(error instanceof AssistantServiceError)throw new AppError(error.message,error.status);
  // Provider errors can include request bodies or authorization metadata. Keep them out of responses/logs.
  throw new AppError('Der KI-Anbieter konnte gerade keinen gültigen Vorschlag liefern. Ihre Inhalte sind unverändert. Bitte versuchen Sie es erneut.',502);
 }
}
