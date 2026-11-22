import {analyticsFiltersSchema,type AnalyticsFilters,type AnalyticsSession} from './model';
import {outcomeKinds, type AnalyticsOutcome} from './outcome';
export type AnalyticsMetrics={visitors:number;visits:number;views:number;engagedSeconds:number;bounceRate:number;conversions:number;conversionRate:number;visitDepth:number;returningVisitors:number};
export type AnalyticsBreakdown={name:string;value:number};
export type AnalyticsReport={filters:AnalyticsFilters;previousFrom:string;previousTo:string;current:AnalyticsMetrics;previous:AnalyticsMetrics|null;days:Array<{date:string;views:number;visits:number;previousViews:number;previousVisits:number}>;pages:AnalyticsBreakdown[];entries:AnalyticsBreakdown[];exits:AnalyticsBreakdown[];sources:AnalyticsBreakdown[];devices:AnalyticsBreakdown[];browsers:AnalyticsBreakdown[];countries:AnalyticsBreakdown[];campaigns:AnalyticsBreakdown[];goals:AnalyticsBreakdown[];outcomes:Array<{kind:AnalyticsOutcome['kind'];count:number;sources:AnalyticsBreakdown[];campaigns:AnalyticsBreakdown[]}>;availableFrom:string;timezone:'UTC'};
export function reportRange(filters:AnalyticsFilters){const f=analyticsFiltersSchema.parse(filters),from=Date.parse(f.from+'T00:00:00Z'),end=Date.parse(f.to+'T00:00:00Z')+86400000,span=end-from;return{from,end,previousFrom:from-span,previousEnd:from,loadFrom:f.compare?from-span:from};}
export function buildAnalyticsReport(sessions:AnalyticsSession[],input:AnalyticsFilters,retentionDays:number,now=new Date()):AnalyticsReport{
 const filters=analyticsFiltersSchema.parse(input),r=reportRange(filters),cutoff=now.getTime()-retentionDays*86400000;
 const matches=(s:AnalyticsSession)=>!((filters.device&&s.device!==filters.device)||(filters.source&&s.source!==filters.source)||(filters.campaign&&s.campaign!==filters.campaign)||(filters.country&&s.country!==filters.country));
 const select=(from:number,to:number)=>sessions.filter(matches).filter(s=>Date.parse(s.startedAt)>=cutoff).flatMap(s=>{const pages=s.pages.filter(p=>Date.parse(p.enteredAt)>=Math.max(from,cutoff)&&Date.parse(p.enteredAt)<to&&(!filters.path||p.path===filters.path));return pages.length?[{...s,pages}]:[];});
 const current=select(r.from,r.end),previous=select(r.previousFrom,r.previousEnd);
 const metrics=(list:AnalyticsSession[]):AnalyticsMetrics=>{const views=list.reduce((n,s)=>n+s.pages.length,0),time=list.reduce((n,s)=>n+s.pages.reduce((sum,p)=>sum+p.engagedMs,0),0),conversions=list.filter(s=>s.pages.some(p=>p.goals.length)).length,bounces=list.filter(s=>s.pages.length===1&&s.pages[0].engagedMs<10000&&!s.pages[0].goals.length).length;const unique=new Set<string>(),returning=new Set<string>();for(const s of list){if(unique.has(s.visitor))returning.add(s.visitor);unique.add(s.visitor);}return{visitors:unique.size,returningVisitors:returning.size,visitDepth:list.length?views/list.length:0,visits:list.length,views,engagedSeconds:list.length?Math.round(time/1000/list.length):0,bounceRate:list.length?bounces/list.length*100:0,conversions,conversionRate:list.length?conversions/list.length*100:0};};
 const breakdown=(values:string[])=>{const counts=new Map<string,number>();for(const v of values)counts.set(v||'unbekannt',(counts.get(v||'unbekannt')??0)+1);return[...counts].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name)).slice(0,12);};
 const recorded=new Map<string,{kind:AnalyticsOutcome['kind'];source:string;campaign:string}>();
 for(const session of sessions.filter(matches).sort((a,b)=>a.startedAt.localeCompare(b.startedAt))){
  for(const page of session.pages){
   if(filters.path&&page.path!==filters.path)continue;
   for(const outcome of page.outcomes??[]){
    const at=Date.parse(outcome.at);
    if(at>=Math.max(r.from,cutoff)&&at<r.end&&!recorded.has(outcome.id))recorded.set(outcome.id,{kind:outcome.kind,source:session.source,campaign:session.campaign});
   }
  }
 }
 const outcomes=outcomeKinds.map(kind=>{
  const matches=[...recorded.values()].filter(result=>result.kind===kind);
  return {kind,count:matches.length,sources:breakdown(matches.map(result=>result.source)),campaigns:breakdown(matches.map(result=>result.campaign).filter(Boolean))};
 });
 const aggregateDays=(list:AnalyticsSession[])=>{const views=new Map<string,number>(),visits=new Map<string,number>();for(const session of list){const seen=new Set<string>();for(const page of session.pages){const date=page.enteredAt.slice(0,10);views.set(date,(views.get(date)??0)+1);seen.add(date);}for(const date of seen)visits.set(date,(visits.get(date)??0)+1);}return{views,visits};};
 const daily=aggregateDays(current),priorDaily=aggregateDays(previous),days:AnalyticsReport['days']=[];for(let t=r.from;t<r.end;t+=86400000){const date=new Date(t).toISOString().slice(0,10),previousDate=new Date(t-(r.end-r.from)).toISOString().slice(0,10);days.push({date,views:daily.views.get(date)??0,visits:daily.visits.get(date)??0,previousViews:filters.compare?priorDaily.views.get(previousDate)??0:0,previousVisits:filters.compare?priorDaily.visits.get(previousDate)??0:0});}
 return{filters,previousFrom:new Date(r.previousFrom).toISOString().slice(0,10),previousTo:new Date(r.previousEnd-1).toISOString().slice(0,10),current:metrics(current),previous:filters.compare&&r.previousFrom>=cutoff?metrics(previous):null,days,pages:breakdown(current.flatMap(s=>s.pages.map(p=>p.path))),entries:breakdown(current.filter(s=>s.pages[0].enteredAt===s.startedAt).map(s=>s.pages[0].path)),exits:breakdown(current.map(s=>s.pages.at(-1)!.path)),sources:breakdown(current.map(s=>s.source)),devices:breakdown(current.map(s=>s.device)),browsers:breakdown(current.map(s=>s.browser)),countries:breakdown(current.map(s=>s.country)),campaigns:breakdown(current.filter(s=>s.campaign).map(s=>s.campaign)),goals:breakdown(current.flatMap(s=>s.pages.flatMap(p=>p.goals))),outcomes,availableFrom:new Date(cutoff).toISOString().slice(0,10),timezone:'UTC'};
}
