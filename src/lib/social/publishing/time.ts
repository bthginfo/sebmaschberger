export type WallTimeChoice={instant:string;offset:string;label:string};
const parts=(date:Date,timeZone:string)=>Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
export function localWallTime(instant:string,timeZone:string){const p=parts(new Date(instant),timeZone);return`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;}
/** Returns zero choices for a DST gap and two choices for a repeated wall time. */
export function resolveWallTime(value:string,timeZone:string):WallTimeChoice[]{
 if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value))return[];
 const [year,month,day,hour,minute]=value.match(/\d+/g)!.map(Number),approx=Date.UTC(year,month-1,day,hour,minute),offsets=new Set<number>();
 try{for(const delta of [-36,-12,0,12,36]){const at=new Date(approx+delta*3600000),p=parts(at,timeZone);offsets.add(Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute)-Math.floor(at.getTime()/60000)*60000);}}catch{return[];}
 return[...offsets].map(offset=>({offset,at:new Date(approx-offset)})).filter(({at})=>localWallTime(at.toISOString(),timeZone)===value).sort((a,b)=>a.at.getTime()-b.at.getTime()).map(({at,offset})=>{const sign=offset<0?'-':'+',minutes=Math.abs(offset)/60000,display=`${sign}${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;return{instant:at.toISOString(),offset:display,label:`${value.replace('T',' ')} · UTC${display}`};});
}
export function formatPlannedTime(instant:string|null,timeZone:string){return instant?new Intl.DateTimeFormat('de-DE',{timeZone,dateStyle:'medium',timeStyle:'short'}).format(new Date(instant))+' · '+timeZone:'Noch kein Zeitpunkt';}
export function preparationTime(kind:'image'|'reel',scheduledAt:string){return new Date(Date.parse(scheduledAt)-(kind==='reel'?10:1)*60000).toISOString();}
export function nextQueueWake(at:string,now:string,horizonSeconds=6*86400){return new Date(Math.min(Date.parse(at),Date.parse(now)+horizonSeconds*1000)).toISOString();}
