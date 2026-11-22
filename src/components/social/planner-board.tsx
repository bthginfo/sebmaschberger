"use client";

import {useEffect,useMemo,useState} from 'react';
import {PlannerCover} from './planner-cover';
import {Search,Plus,ChevronLeft,ChevronRight,List,CalendarDays,Image as ImageIcon,Layers3,Play,MoreHorizontal,Download,SlidersHorizontal,X,Clock3} from 'lucide-react';
import {PLATFORM_IDS,effectivePlatform,effectiveDelivery,type PublicationRecord,type PublicationPlatform,type ConnectionView} from '@/lib/social/publishing/model';
import {platformGuide} from '@/lib/social/publishing/platforms';
import {calendarToday,calendarDays,moveCalendar,calendarLabel,dayLabel,publicationDay,publicationTime,presentation,plannerMatches,plannerCounts,coverMedia,undatedPlannerGroups,PLANNER_SCOPES,type PlannerView,type PlannerScope} from '@/lib/social/publishing/planner-view';
import '@/styles/planner-board.css';
import { useAdminLanguage } from "@/components/admin/admin-language";

type Props={
 entries:PublicationRecord[];connections:ConnectionView[];brand?:string;brands:{key:string;label:string}[];
 onBrandChange:(key:string)=>void;onPlatformChange:(key:PublicationPlatform|'all')=>void;
 onOpen:(id:string)=>void;onCreate:(day?:string)=>void;
 onExport:(format:'csv'|'ics'|'text',items:PublicationRecord[])=>void;onChannels:()=>void;disabled?:boolean;
};
export function PlannerBoard({entries,connections,brand='all',brands,onBrandChange,onPlatformChange,onOpen,onCreate,onExport,onChannels,disabled=false}:Props){
  const { t } = useAdminLanguage();
 const[view,setViewState]=useState<PlannerView>('week'),[scope,setScope]=useState<PlannerScope>('all'),[query,setQuery]=useState('');
 const[zone,setZone]=useState('Europe/Berlin'),[anchor,setAnchor]=useState(()=>calendarToday('Europe/Berlin')),[channel,setChannel]=useState<PublicationPlatform|'all'>('all');
 const[mobileDay,setMobileDay]=useState(()=>calendarToday('Europe/Berlin')),[filtersOpen,setFiltersOpen]=useState(false),[failedImages,setFailedImages]=useState<string[]>([]);
 const matchingBrand=useMemo(()=>entries.filter(item=>(brand==='all'||item.source.brandKey===brand)&&(channel==='all'||effectivePlatform(item)===channel)),[entries,brand,channel]);
 const counts=useMemo(()=>plannerCounts(matchingBrand),[matchingBrand]);
 const filtered=useMemo(()=>matchingBrand.filter(item=>plannerMatches(item,query,scope)).sort((a,b)=>(a.scheduledAt||'9999').localeCompare(b.scheduledAt||'9999')),[matchingBrand,query,scope]);
 const days=calendarDays(anchor,view),undatedGroups=undatedPlannerGroups(filtered),undated=undatedGroups.active,closed=undatedGroups.closed,today=calendarToday(zone);
 const targets=[...new Map(connections.filter(item=>item.status==='connected'&&!item.lastError).map(item=>[(item.platform||'instagram')+':'+item.accountId,item])).values()];
 const isFiltered=Boolean(query||scope!=='all'||brand!=='all'||channel!=='all');
 useEffect(()=>{try{const stored=localStorage.getItem('cms:planner:view');if(stored==='week'||stored==='month'||stored==='list')setViewState(stored);}catch{}},[]);
 function setView(value:PlannerView){setViewState(value);try{localStorage.setItem('cms:planner:view',value);}catch{}}
 function resetFilters(){setQuery('');setScope('all');setChannel('all');onPlatformChange('all');onBrandChange('all');}
 function post(item:PublicationRecord,compact=false){
  const state=presentation(item),cover=coverMedia(item);
  return <button key={item.id} type="button" className={'schedule-card'+(compact?' schedule-card--compact':'')} data-tone={state.tone} disabled={disabled} onClick={()=>onOpen(item.id)} aria-label={item.source.title+', '+item.source.brandLabel+', '+(item.scheduledAt?dayLabel(publicationDay(item,zone)!,true)+' '+publicationTime(item,zone):'ohne Termin')+', '+state.label}>
   <span className="schedule-card-art">
    {item.kind==='reel'?<Play size={25} strokeWidth={1.5}/>:item.kind==='text'?<span className="schedule-text-preview">{item.caption||item.source.title}</span>:<ImageIcon size={27} strokeWidth={1.4}/>}
    {cover?.kind==='image'&&!failedImages.includes(cover.id)&&<img src={'/api/admin/social/planner/media/'+cover.id} alt="" loading="lazy" decoding="async" onError={()=>setFailedImages(previous=>[...previous,cover.id])}/>}
    {!cover&&item.kind!=='text'&&<PlannerCover item={item}/>}
    <span className="schedule-format">{item.carousel?<><Layers3 size={12}/>{item.source.slides}</>:item.kind==='reel'?<><Play size={12}/>Reel</>:item.kind==='text'?'Text':'Post'}</span>
   </span>
   <span className="schedule-card-copy"><span className="schedule-card-meta"><span>{platformGuide(effectivePlatform(item)).label}</span><time dateTime={item.scheduledAt||undefined}>{publicationTime(item,zone)}</time></span><strong>{item.source.title}</strong><span className="schedule-card-brand">{item.source.brandLabel}</span><span className="schedule-card-bottom"><span className="schedule-status" data-tone={state.tone}><i/>{state.label}</span>{effectiveDelivery(item)==='manual'&&<span className="schedule-delivery" title={t("Sie veröffentlichen diesen Beitrag selbst")}>{t("Manuell")}</span>}</span></span>
  </button>;
 }
 return <div className="schedule-board" aria-label={t("Beitragskalender")}>
  <div className="schedule-overview"><nav className="schedule-scopes" aria-label={t("Beiträge nach Bearbeitungsstand")}>{PLANNER_SCOPES.map(item=><button key={item.key} type="button" aria-pressed={scope===item.key} onClick={()=>setScope(item.key)}>{item.label}<span>{counts[item.key]}</span></button>)}</nav><button type="button" className="schedule-connection" onClick={onChannels}><span className={targets.length?'connected':undefined}/>{targets.length?targets.length+' '+(targets.length===1?'Kanal verbunden':'Kanäle verbunden'):t("Kanal verbinden")}<ChevronRight size={14}/></button></div>
  <div className="schedule-controls"><div className="schedule-period">
   {view!=='list'&&<button type="button" className="schedule-icon" aria-label={view==='month'?t("Vorheriger Monat"):t("Vorherige Woche")} onClick={()=>setAnchor(moveCalendar(anchor,-1,view))}><ChevronLeft size={18}/></button>}
   <h2>{calendarLabel(anchor,view)}</h2>
   {view!=='list'&&<><button type="button" className="schedule-icon" aria-label={view==='month'?t("Nächster Monat"):t("Nächste Woche")} onClick={()=>setAnchor(moveCalendar(anchor,1,view))}><ChevronRight size={18}/></button><button type="button" className="schedule-today" onClick={()=>{setAnchor(today);setMobileDay(today);}}>{t("Heute")}</button></>}
  </div><div className="schedule-control-end">
   <div className="schedule-view" aria-label={t("Kalenderansicht")}><button type="button" aria-pressed={view==='week'} onClick={()=>setView('week')}>{t("Woche")}</button><button type="button" aria-pressed={view==='month'} onClick={()=>setView('month')}>{t("Monat")}</button><button type="button" aria-pressed={view==='list'} aria-label={t("Beitragsliste")} onClick={()=>setView('list')}><List size={17}/></button></div>
   <button type="button" className="schedule-icon schedule-filter-toggle" aria-label={t("Filter und Zeitzone")} aria-expanded={filtersOpen} onClick={()=>setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={18}/></button>
   <details className="schedule-menu"><summary aria-label={t("Kalender exportieren")}><MoreHorizontal size={21}/></summary><div className="schedule-menu-panel"><strong>{t("Auswahl exportieren")}</strong><button type="button" disabled={!filtered.length} onClick={()=>onExport('csv',filtered)}><Download size={15}/>{t("Tabelle · CSV")}</button><button type="button" disabled={!filtered.some(item=>item.scheduledAt)} onClick={()=>onExport('ics',filtered)}><CalendarDays size={15}/>{t("Kalender · ICS")}</button><button type="button" disabled={!filtered.length} onClick={()=>onExport('text',filtered)}><List size={15}/>{t("Übersicht · Text")}</button></div></details>
  </div></div>
  <div className={'schedule-filters'+(filtersOpen?' schedule-filters--open':'')}><label className="schedule-search"><Search size={17}/><input type="search" aria-label={t("Beiträge durchsuchen")} placeholder={t("Beiträge suchen …")} value={query} onChange={event=>setQuery(event.target.value)}/>{query&&<button type="button" className="schedule-clear" aria-label={t("Suche löschen")} onClick={()=>setQuery('')}><X size={14}/></button>}</label>
   {brands.length>1&&<label className="schedule-select"><span className="social-sr-only">{t("Marke filtern")}</span><select value={brand} onChange={event=>onBrandChange(event.target.value)}><option value="all">{t("Alle Marken")}</option>{brands.map(item=><option key={item.key} value={item.key}>{item.label}</option>)}</select></label>}
   <label className="schedule-select"><span className="social-sr-only">{t("Kanal filtern")}</span><select value={channel} onChange={event=>{setChannel(event.target.value as PublicationPlatform|'all');onPlatformChange(event.target.value as PublicationPlatform|'all');}}><option value="all">{t("Alle Kanäle")}</option>{PLATFORM_IDS.map(id=><option key={id} value={id}>{platformGuide(id).label}</option>)}</select></label>
   {filtersOpen&&<label className="schedule-select"><span className="social-sr-only">{t("Zeitzone des Kalenders")}</span><select value={zone} onChange={event=>setZone(event.target.value)}>{['Europe/Berlin','Europe/London','America/New_York','America/Los_Angeles','UTC'].map(value=><option key={value}>{value}</option>)}</select></label>}
   {isFiltered&&<button type="button" className="schedule-reset" onClick={resetFilters}>{t("Zurücksetzen")}</button>}
  </div>
  {view==='list'?<div className="schedule-list">{filtered.length?filtered.map(item=><div key={item.id} className="schedule-list-row"><span className="schedule-list-date">{item.scheduledAt?dayLabel(publicationDay(item,zone)!,true):t("Ohne Termin")}</span>{post(item,true)}</div>):<div className="schedule-empty"><Search size={27} strokeWidth={1.5}/><h3>{isFiltered?t("Keine passenden Beiträge."):t("Platz für Ihre nächste Idee.")}</h3><p>{isFiltered?t("Passen Sie die Suche oder Filter an."):t("Planen Sie einen Beitrag aus dem Studio, laden Sie eine Datei hoch oder halten Sie eine Textidee fest.")}</p><button type="button" disabled={disabled} onClick={()=>isFiltered?resetFilters():onCreate()}>{isFiltered?t("Filter zurücksetzen"):t("Beitrag planen")}</button></div>}</div>:<>
   <div className={'schedule-grid '+(view==='month'?'schedule-grid--month':'schedule-grid--week')}>{days.map(day=>{
    const items=filtered.filter(item=>publicationDay(item,zone)===day);
    return <section key={day} className={'schedule-day'+(day===today?' schedule-day--today':'')+(view==='month'&&day.slice(0,7)!==anchor.slice(0,7)?' schedule-day--outside':'')} aria-label={dayLabel(day,true)}>
     <header className="schedule-day-heading"><button type="button" className="schedule-day-number" aria-pressed={mobileDay===day} onClick={()=>setMobileDay(day)}><span>{new Intl.DateTimeFormat('de-DE',{weekday:'short',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'))}</span><time dateTime={day}>{Number(day.slice(-2))}</time></button>{(items.length>0||view==='month')&&<button type="button" className="schedule-day-add" aria-label={'Beitrag am '+dayLabel(day,true)+' planen'} disabled={disabled} onClick={()=>onCreate(day)}><Plus size={15}/></button>}</header>
     <div className="schedule-day-posts">{items.length?items.map(item=>post(item,view==='month')):<button type="button" className="schedule-day-empty" aria-label={'Beitrag am '+dayLabel(day,true)+' planen'} disabled={disabled} onClick={()=>onCreate(day)}><Plus size={16}/><span>{t("Beitrag planen")}</span></button>}</div>
     {items.length>0&&<span className="schedule-day-dots" aria-hidden="true">{items.slice(0,4).map(item=><i key={item.id} data-tone={presentation(item).tone}/>)}</span>}
    </section>;
   })}</div>
   {view==='month'&&<section className="schedule-mobile-day"><header><h3>{dayLabel(mobileDay,true)}</h3><button type="button" className="schedule-icon" aria-label={t("Beitrag für diesen Tag planen")} disabled={disabled} onClick={()=>onCreate(mobileDay)}><Plus size={18}/></button></header>{filtered.filter(item=>publicationDay(item,zone)===mobileDay).length?filtered.filter(item=>publicationDay(item,zone)===mobileDay).map(item=>post(item,true)):<p>{t("Noch kein Beitrag für diesen Tag.")}</p>}</section>}
   {undated.length>0&&<section className="schedule-undated"><header><h3>{t("Ideen ohne Termin") + " "}<span>{undated.length}</span></h3><span>{t("Bereit, wenn Sie es sind.")}</span></header><div>{undated.map(item=>post(item,true))}</div></section>}
   {closed.length>0&&<details className="schedule-archive" open={scope==='done'||Boolean(query.trim())}><summary><span>{t("Erledigte & abgebrochene Beiträge ohne Termin")}</span><span>{closed.length}</span><ChevronRight size={16}/></summary><div className="schedule-archive-posts">{closed.map(item=>post(item,true))}</div></details>}
  </>}
  <div className="schedule-footnote"><Clock3 size={13}/><span>{t("Zeiten in") + " "}{zone}</span><span>{filtered.length} {filtered.length===1?t("Beitrag"):t("Beiträge")}</span></div>
 </div>;
}
