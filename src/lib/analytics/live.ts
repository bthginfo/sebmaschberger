import {safeAnalyticsPath,type AnalyticsSession} from './model';
import type {AnalyticsBreakdown} from './report';

export const liveMinutes=5;
const minute=60_000;
export type LiveSession=Pick<AnalyticsSession,'visitor'|'updatedAt'|'startedAt'|'device'|'source'>&{path:string};
export type LiveReport={
 enabled:boolean;observedAt:string;windowMinutes:number;
 visitors:number;visits:number;newVisits:number;
 activity:Array<{minutesAgo:number;visitors:number}>;
 pages:AnalyticsBreakdown[];devices:AnalyticsBreakdown[];sources:AnalyticsBreakdown[];
};
export function projectLiveSession(session:AnalyticsSession):LiveSession{
 const {visitor,device,source,startedAt,updatedAt}=session;
 return {visitor,device,source,startedAt,updatedAt,path:session.pages.at(-1)?.path??''};
}
function count(values:string[]):AnalyticsBreakdown[]{
 const sums=new Map<string,number>();
 for(const value of values)if(value)sums.set(value,(sums.get(value)??0)+1);
 return [...sums].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name)).slice(0,8);
}
export function buildLiveReport(enabled:boolean,sessions:LiveSession[],at:Date):LiveReport{
 const cutoff=+at-liveMinutes*minute;
 const eligible=enabled?sessions.flatMap(session=>{
  const last=Date.parse(session.updatedAt),path=safeAnalyticsPath(session.path);
  return last>=cutoff&&last<=+at&&session.visitor&&path?[{...session,path}]:[];
 }):[];
 const latest=new Map<string,LiveSession>();
 for(const session of eligible){
  const previous=latest.get(session.visitor);
  if(!previous||previous.updatedAt<session.updatedAt)latest.set(session.visitor,session);
 }
 const visitors=[...latest.values()];
 const activity=Array.from({length:liveMinutes},(_,index)=>({minutesAgo:liveMinutes-1-index,visitors:0}));
 for(const session of visitors){
  const bucket=Math.min(liveMinutes-1,Math.floor((Date.parse(session.updatedAt)-cutoff)/minute));
  activity[bucket].visitors++;
 }
 return {
  enabled,observedAt:at.toISOString(),windowMinutes:liveMinutes,
  visitors:visitors.length,visits:eligible.length,newVisits:eligible.filter(session=>Date.parse(session.startedAt)>=cutoff).length,
  activity,pages:count(visitors.map(session=>session.path)),devices:count(visitors.map(session=>session.device)),sources:count(visitors.map(session=>session.source)),
 };
}
