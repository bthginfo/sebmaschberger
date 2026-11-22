import 'server-only';
import {AppError,deleteCollection,getRecord,guardedMutateRecord,mutateRecord,pruneModuleRecords,recordPage,recentAnalyticsSessions} from '@/lib/db';
import type {AnalyticsSession,AnalyticsSettings} from '@/lib/analytics/model';
import {createAnalyticsService} from './service';
export const analytics=createAnalyticsService({
 readSettings:()=>getRecord<AnalyticsSettings>('analytics-settings','main'),
 mutateSettings:async update=>(await mutateRecord<AnalyticsSettings|null>('analytics-settings','main',null,update))!,
 mutateSession:async(id,settings,update)=>{await guardedMutateRecord<AnalyticsSession|null>('analytics-sessions',id,null,update,{collection:'analytics-settings',id:'main',expected:settings});},
 sessions:async(from,to)=>{const all:AnalyticsSession[]=[];let after:string|null=null;for(;;){const page:Array<{id:string;data:AnalyticsSession}>=await recordPage<AnalyticsSession>('analytics-sessions',after,from,to);all.push(...page.map(p=>p.data));if(page.length<500)return all;if(all.length>=50000)throw new AppError('Für diesen Zeitraum liegen sehr viele Sitzungen vor. Bitte den Zeitraum verkürzen.',422);after=page.at(-1)!.id;}},
 recent:async(generation,from,to)=>{
  const sessions=await recentAnalyticsSessions(generation,from,to);
  if(sessions.length>10000)throw new AppError('Gerade gehen zu viele Signale für die Live-Ansicht ein.',422);
  return sessions;
 },
 cleanup:before=>pruneModuleRecords('analytics-sessions',before),clear:()=>deleteCollection('analytics-sessions')
});
