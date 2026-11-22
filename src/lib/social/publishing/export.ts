import {effectiveDelivery,effectivePlatform,isReferenceSource,PUBLICATION_LABELS,type PublicationRecord} from './model';

const platformLabels={instagram:'Instagram',tiktok:'TikTok',youtube:'YouTube',linkedin:'LinkedIn',facebook:'Facebook',pinterest:'Pinterest',threads:'Threads',bluesky:'Bluesky'};
const sourceUrl=(entry:PublicationRecord)=>isReferenceSource(entry.source)?entry.source.url??'':'';
const status=(entry:PublicationRecord)=>PUBLICATION_LABELS[entry.status];
export function plannerText(entry:PublicationRecord){
 return[entry.source.title,'Marke: '+entry.source.brandLabel,'Kanal: '+platformLabels[effectivePlatform(entry)],'Übergabe: '+(effectiveDelivery(entry)==='manual'?'Manuell':effectiveDelivery(entry)==='handoff'?'In TikTok freigeben':platformLabels[effectivePlatform(entry)]+' automatisch'),...(entry.targetLabel?['Ziel: '+entry.targetLabel]:[]),'Status: '+status(entry),'Termin: '+(entry.scheduledAt??'Noch offen'),'Zeitzone: '+entry.timeZone,...(sourceUrl(entry)?['Original: '+sourceUrl(entry)]:[]),'','Caption:',entry.caption,...(entry.altText?['','Bildbeschreibung:',entry.altText]:[]),...(entry.manualCompletion?['','Manuell erledigt: '+entry.manualCompletion.at]:[])].join('\n');
}
/** Quoting protects delimiters; the prefix additionally prevents spreadsheet formula execution. */
export function csvCell(value:unknown){
 let text=String(value??'');if(/^[\s\uFEFF]*[=+\-@]/.test(text)||/^[\t\r]/.test(text))text="'"+text;
 return '"'+text.replace(/"/g,'""')+'"';
}
export function plannerCsv(entries:PublicationRecord[]){
 const rows=[['ID','Titel','Marke','Plattform','Übergabe','Ziel','Status','Termin UTC','Zeitzone','Original','Caption','Bildbeschreibung','Manuell erledigt UTC'],...entries.map(entry=>[entry.id,entry.source.title,entry.source.brandLabel,effectivePlatform(entry),effectiveDelivery(entry),entry.targetLabel??'',status(entry),entry.scheduledAt??'',entry.timeZone,sourceUrl(entry),entry.caption,entry.altText,entry.manualCompletion?.at??''])];
 return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
export const icsText=(value:string)=>value.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
const utc=(value:string)=>new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
/** Fold at 75 UTF-8 octets without splitting a Unicode character. */
function fold(line:string){const encoder=new TextEncoder();let result='',part='',bytes=0;for(const char of line){const length=encoder.encode(char).length;if(bytes+length>75){result+=part+'\r\n';part=' ';bytes=1;}part+=char;bytes+=length;}return result+part;}
export function plannerIcs(entries:PublicationRecord[]){
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Social Planner//Manual Plans//DE','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
 for(const entry of entries.filter(value=>value.scheduledAt)){
  lines.push('BEGIN:VEVENT','UID:'+entry.id+'@social-planner.invalid','DTSTAMP:'+utc(entry.updatedAt),'LAST-MODIFIED:'+utc(entry.updatedAt),'SEQUENCE:'+entry.revision,'DTSTART:'+utc(entry.scheduledAt!),'SUMMARY:'+icsText(platformLabels[effectivePlatform(entry)]+': '+entry.source.title),'DESCRIPTION:'+icsText(plannerText(entry)),'STATUS:'+(entry.status==='cancelled'?'CANCELLED':'CONFIRMED'),'X-SOCIAL-DELIVERY:'+effectiveDelivery(entry),'X-SOCIAL-STATUS:'+entry.status,'END:VEVENT');
 }
 lines.push('END:VCALENDAR');return lines.map(fold).join('\r\n')+'\r\n';
}
export function plannerExport(entries:PublicationRecord[],format:'text'|'csv'|'ics'){
 if(format==='csv')return{content:plannerCsv(entries),mimeType:'text/csv;charset=utf-8',filename:'social-plan.csv'};
 if(format==='ics')return{content:plannerIcs(entries),mimeType:'text/calendar;charset=utf-8',filename:'social-plan.ics'};
 return{content:entries.map(plannerText).join('\n\n---\n\n'),mimeType:'text/plain;charset=utf-8',filename:'social-plan.txt'};
}

