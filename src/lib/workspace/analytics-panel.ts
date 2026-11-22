import './analytics.css';
import {defaultAnalyticsFilters,type AnalyticsFilters,type AnalyticsPublic} from '../analytics/model';
import type {AnalyticsReport,AnalyticsBreakdown,AnalyticsMetrics} from '../analytics/report';
import type {LiveReport} from '../analytics/live';
import type {Metrics} from '../newsletter/model';
import {button,detail,dialog,download,field,input,node,request,select,status} from './panel';
import type { WorkspaceCopy, WorkspacePanel } from './panel';

type Settings=AnalyticsPublic&{revision:number;changedAt:string};
type Workspace={
 settings:Settings;
 report:AnalyticsReport & {outcomes?:Array<{kind:string;count:number;sources:AnalyticsBreakdown[]}>};
 newsletter?:{active:boolean;totals:Metrics;confirmed:number};
};
type View='overview'|'live'|'newsletter';
type Breakdown='pages'|'acquisition'|'audience'|'goals';
type Series='views'|'visits';
export function mountAnalyticsPanel(root:HTMLElement, initialCopy: WorkspaceCopy): WorkspacePanel {
 let copy = initialCopy;
 const t: WorkspaceCopy['t'] = (message, values) => copy.t(message, values);
 const locale = () => copy.language === 'en' ? 'en-GB' : 'de-DE';
 const date=(value:string)=>new Date(value+'T00:00:00Z').toLocaleDateString(locale(),{day:'numeric',month:'short',timeZone:'UTC'});
 const longDate=(value:string)=>new Date(value+'T00:00:00Z').toLocaleDateString(locale(),{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
 const clock=(value:string)=>new Date(value).toLocaleTimeString(locale(),{hour:'2-digit',minute:'2-digit',second:'2-digit'});
 const number = (value: number) => num.format(value);
  let num = new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 });
 const deviceNames:Record<string,string>={desktop:'Desktop',mobile:'Smartphone',tablet:'Tablet'};
 const pageName=(value:string)=>value==='/'?t('Startseite'):value;
 let countries = new Intl.DisplayNames([locale()], { type: 'region' });
 const countryName=(value:string)=>/^[A-Z]{2}$/.test(value)?countries.of(value)??value:t('Unbekannt');
 const sourceName=(value:string)=>value==='direkt'?t('Direkt'):value==='newsletter'?'Newsletter':value;
 const formatMetric=(key:keyof AnalyticsMetrics,value:number)=>{
  if(key==='bounceRate'||key==='conversionRate')return num.format(value)+' %';
  if(key==='engagedSeconds')return value<60?value+' s':Math.floor(value/60)+' min '+String(value%60).padStart(2,'0')+' s';
  return num.format(value);
 };
 const svgNS='http://www.w3.org/2000/svg';
 function svg<T extends keyof SVGElementTagNameMap>(tag:T,attrs:Record<string,string|number>={}){
  const element=document.createElementNS(svgNS,tag);
  for(const [name,value] of Object.entries(attrs))element.setAttribute(name,String(value));
  return element;
 }
 function path(points:Array<[number,number]>){
  return points.map(([x,y],index)=>(index?'L':'M')+x.toFixed(2)+' '+y.toFixed(2)).join(' ');
 }
 function tag(text:string,extra=''){
  return node('span',text,'an-tag '+extra);
 }
 function choice(label:string,key:string,selected:boolean,action:()=>void){
  const item=button(label,action);
  item.dataset.focusKey=key;item.setAttribute('aria-pressed',String(selected));
  return item;
 }
 function group(label:string){
  const el=node('div','','an-segment');
  el.setAttribute('role','group');el.setAttribute('aria-label',label);
  return el;
 }
 function card(title:string,kicker?:string){
  const el=node('section','','an-card');
  if(kicker)el.append(node('span',t(kicker),'an-kicker'));
  el.append(node('h2',title));return el;
 }
 function breakdown(title:string,rows:AnalyticsBreakdown[],label=(value:string)=>value,action?:(name:string)=>void){
  const el=card(title);
  if(!rows.length){el.append(node('p',t("Für diese Auswahl gibt es noch keine Daten."),'an-empty'));return el;}
  const list=node('ol','','an-ranking'),max=Math.max(1,...rows.map(row=>row.value));
  for(const row of rows.slice(0,8)){
   const item=node('li'),meta=node('div','','an-rank-meta');
   const caption=action?button(label(row.name),()=>action(row.name)):node('span',label(row.name));
   const bar=node('span','','an-meter'),fill=node('span');
   fill.style.width=row.value/max*100+'%';
   bar.setAttribute('aria-hidden','true');bar.append(fill);
   meta.append(caption,node('strong',number(row.value)));item.append(meta,bar);list.append(item);
  }
  el.append(list);return el;
 }
 function metric(label:string,value:string,hint:string,comparison?:{text:string;positive?:boolean}){
  const tile=node('article','','an-metric');
  tile.append(node('p',label,'an-metric-label'),node('strong',value,'an-metric-value'));
  const foot=node('div','','an-metric-foot');
  if(comparison)foot.append(tag(comparison.text,comparison.positive===true?'an-up':comparison.positive===false?'an-down':''));
  else foot.append(node('small',hint));
  tile.title=hint;tile.append(foot);return tile;
 }
 function compare(key:keyof AnalyticsMetrics,value:number,prior?:number){
  if(prior===undefined)return undefined;
  const change=value-prior;
  if(change===0)return {text:t("Unverändert")};
  if(key==='bounceRate'||key==='conversionRate')return {text:t("{0}{1} Pp.", { 0: change>0?'+':'', 1: num.format(change) }),positive:key==='bounceRate'?change<0:change>0};
  if(!prior)return {text:t("Neu im Zeitraum"),positive:true};
  return {text:(change>0?'+':'')+num.format(change/prior*100)+' %',positive:change>0};
 }
 function trendChart(report:AnalyticsReport,series:Series){
  const figure=node('figure','','an-trend');
  const width=800,height=235,left=10,right=790,top=12,floor=216;
  const counts=report.days.map(day=>day[series]);
  const previous=report.days.map(day=>series==='views'?day.previousViews:day.previousVisits);
  const max=Math.max(1,...counts,...(report.previous?previous:[]));
  const svgChart=svg('svg',{viewBox:'0 0 '+width+' '+height,preserveAspectRatio:'none','aria-hidden':'true'});
  const x=(index:number)=>counts.length===1?width/2:left+index/(counts.length-1)*(right-left);
  const y=(value:number)=>floor-value/max*(floor-top);
  const lineFor=(values:number[])=>path(values.map((value,index)=>[x(index),y(value)]));
  const gradientId='an-area-'+crypto.randomUUID();
  const gradient=svg('linearGradient',{id:gradientId,x1:'0',x2:'0',y1:'0',y2:'1'});
  gradient.append(svg('stop',{offset:'0','stop-color':'var(--an-accent)','stop-opacity':'.23'}),svg('stop',{offset:'1','stop-color':'var(--an-accent)','stop-opacity':'0.015'}));
  const defs=svg('defs');defs.append(gradient);svgChart.append(defs);
  for(const step of [0,.25,.5,.75,1]){
   const coordinate=y(max*step);
   svgChart.append(svg('line',{x1:left,y1:coordinate,x2:right,y2:coordinate,class:'an-gridline'}));
  }
  if(counts.length>1)svgChart.append(svg('path',{d:lineFor(counts)+' L'+x(counts.length-1)+' '+floor+' L'+x(0)+' '+floor+' Z',fill:'url(#'+gradientId+')'}));
  if(report.previous)svgChart.append(svg('path',{d:lineFor(previous),class:'an-previous'}));
  svgChart.append(svg('path',{d:lineFor(counts),class:'an-series'}));
  const guide=svg('line',{y1:top,y2:floor,class:'an-guide'}),point=svg('circle',{r:4,class:'an-point'});
  svgChart.append(guide,point);
  const stage=node('div','','an-trend-stage');
  stage.tabIndex=0;stage.setAttribute('role','group');
  stage.setAttribute('aria-label',t("Verlauf erkunden. Wählen Sie einen Tag mit der linken oder rechten Pfeiltaste."));
  const readout=node('figcaption','','an-readout'),selectedDate=node('strong'),selectedCount=node('span');
  readout.append(selectedDate,selectedCount);
  const axis=node('div','','an-axis'),ticks=counts.length===1?[0]:[0,Math.floor((counts.length-1)/2),counts.length-1];
  for(const index of new Set(ticks))axis.append(node('span',date(report.days[index].date)));
  const labels=node('div','','an-ylabels');
  labels.append(node('span',number(max)),node('span','0'));
  stage.append(labels,svgChart);
  figure.append(readout,stage,axis);
  let active=counts.length-1;
  function inspect(index:number){
   active=Math.min(counts.length-1,Math.max(0,index));
   const pos=x(active);
   guide.setAttribute('x1',String(pos));guide.setAttribute('x2',String(pos));
   point.setAttribute('cx',String(pos));point.setAttribute('cy',String(y(counts[active])));
   selectedDate.textContent=longDate(report.days[active].date);
   selectedCount.textContent=number(counts[active])+(series==='views'?' Aufrufe':' Besuche')+(report.previous?' · Vorzeitraum '+number(previous[active]):'');
  }
  stage.addEventListener('pointermove',event=>{
   const bounds=svgChart.getBoundingClientRect();
   inspect(Math.round((event.clientX-bounds.left)/Math.max(1,bounds.width)*(counts.length-1)));
  });
  stage.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   event.preventDefault();
   inspect(event.key==='Home'?0:event.key==='End'?counts.length-1:active+(event.key==='ArrowRight'?1:-1));
   stage.setAttribute('aria-label',t("{0}. {1}. Tag mit Pfeiltasten wechseln.", { 0: selectedDate.textContent, 1: selectedCount.textContent }));
  });
  inspect(active);return figure;
 }
 function downloadReport(report:AnalyticsReport){
  const header=['Datum (UTC)','Seitenaufrufe','Besuche','Vorzeitraum Aufrufe','Vorzeitraum Besuche'];
  const rows=report.days.map(item=>[item.date,item.views,item.visits,report.previous?item.previousViews:'',report.previous?item.previousVisits:'']);
  download('webanalyse-'+report.filters.from+'-'+report.filters.to+'.csv','\uFEFF'+[header,...rows].map(row=>row.join(';')).join('\r\n'),'text/csv;charset=utf-8');
 }

 root.classList.add('cm-workspace','an-workspace');
 let data:Workspace|null=null,filters=defaultAnalyticsFilters(),view:View='overview',kind:Breakdown='pages',series:Series='views';
 let disposed=false,reportAbort:AbortController|undefined,liveAbort:AbortController|undefined,timer:ReturnType<typeof setTimeout>|undefined;
 let live:LiveReport|null=null,liveError='',liveBody:HTMLElement|undefined;
 const refresh=()=>{if(view==='live')void loadLive();else void load();};
 function stopLive(){clearTimeout(timer);liveAbort?.abort();}
 async function load(){
  reportAbort?.abort();const controller=reportAbort=new AbortController();
  root.setAttribute('aria-busy','true');
  try{
   const params=new URLSearchParams(Object.entries(filters).map(([key,value])=>[key,String(value)]));
   const next=await request<Workspace>('/api/admin/analytics?'+params,{signal:controller.signal});
   if(disposed||controller.signal.aborted)return;
   data=next;render();
  }catch(error){
   if(!controller.signal.aborted&&!disposed)status(root,(error as Error).message,true);
  }finally{if(reportAbort===controller)root.removeAttribute('aria-busy');}
 }
 async function loadLive(){
  if(disposed||view!=='live'||document.visibilityState==='hidden')return;
  stopLive();const controller=liveAbort=new AbortController();
  try{
   const next=await request<LiveReport>('/api/admin/analytics?view=live',{signal:controller.signal});
   if(controller.signal.aborted||disposed||view!=='live')return;
   live=next;liveError='';drawLive();
  }catch(error){
   if(!controller.signal.aborted&&!disposed){liveError=(error as Error).message;drawLive();}
  }finally{
   if(!controller.signal.aborted&&!disposed&&view==='live'&&document.visibilityState==='visible')timer=setTimeout(()=>void loadLive(),20_000);
  }
 }
 function visibility(){
  if(document.visibilityState==='hidden')stopLive();
  else if(view==='live')void loadLive();
 }
 function chooseView(next:View){
  if(view===next)return;
  stopLive();view=next;render();
  if(next==='live')void loadLive();
 }
 function changeFilter(key:keyof AnalyticsFilters,value:string){
  filters={...filters,[key]:value};void load();
 }
 function setRange(days:number){
  const next=defaultAnalyticsFilters();
  next.from=new Date(Date.parse(next.to+'T00:00:00Z')-(days-1)*86_400_000).toISOString().slice(0,10);
  filters={...filters,from:next.from,to:next.to};void load();
 }
 function settings(){
  if(!data)return;
  const saved=data.settings,d=dialog(root,t("Webanalyse einrichten"), t('Schließen')),form=node('form');
  const enabled=input('','checkbox'),days=select(['30','90','180','365'].map(value=>[value,t('{0} Tage',{0:value})]),String(saved.retentionDays));
  enabled.checked=saved.enabled;
  const toggle=field(t("Freiwillige Webstatistik aktivieren"),enabled);
  toggle.classList.add('cm-checks');
  const goals=node('div','','cm-goal-list');
  function addGoal(goal?:Settings['goals'][number]){
   const row=node('div','','cm-goal'),label=input(goal?.label??''),url=input(goal?.path??'');
   label.required=url.required=true;label.maxLength=80;url.maxLength=200;url.pattern='/[a-zA-Z0-9/_-]*';url.placeholder='/danke';
   row.dataset.goalId=goal?.id??crypto.randomUUID().slice(0,12);
   row.append(field(t("Zielname"),label),field(t("Öffentlicher Pfad"),url),button(t("Entfernen"),()=>row.remove()));goals.append(row);
  }
  saved.goals.forEach(addGoal);
  const send=node('button',t("Speichern"),'cm-button cm-primary');send.type='submit';
  form.append(toggle,field(t("Aufbewahrung"),days),node('h3',t("Zielseiten")),
   node('p',t("Beispiel: Eine öffentlich erreichbare Danke-Seite als Ziel hinterlegen. Die Auswertung zählt, wie viele zustimmende Besuche sie erreicht haben."),'cm-muted'),
   goals,button(t("Ziel hinzufügen"),()=>{if(goals.children.length<12)addGoal();}),send);
  d.body.append(node('p',t("Die Kategorie „Statistik“ und der passende Datenschutzhinweis folgen dieser Einstellung. Die Live-Ansicht verwendet dieselben freiwilligen Signale."),'cm-muted'),form);
  form.onsubmit=async event=>{
   event.preventDefault();send.disabled=true;
   const items=Array.from(goals.querySelectorAll<HTMLElement>('[data-goal-id]')).map(row=>{
    const [label,url]=row.querySelectorAll('input');return {id:row.dataset.goalId,label:label.value.trim(),path:url.value.trim()};
   });
   try{
    await request('/api/admin/analytics',{method:'POST',body:JSON.stringify({baseRevision:saved.revision,enabled:enabled.checked,retentionDays:Number(days.value),goals:items})});
    d.el.close();await load();if(view==='live')await loadLive();status(root,t("Einstellungen gespeichert."));
   }catch(error){status(d.body,t((error as Error).message),true);send.disabled=false;}
  };
  d.body.append(detail(t("Daten löschen"),t("Entfernt alle bisher gesammelten Sitzungen und macht bestehende Statistik-Freigaben ungültig. Hosting-Protokolle und Newsletter-Zahlen sind davon getrennt.")));
  const erase=button(t("Statistik löschen"),()=>{
   if(window.prompt('Alle Webstatistik-Daten unwiderruflich löschen? Geben Sie „Statistik löschen“ ein.')!=='Statistik löschen')return;
   erase.disabled=true;
   void request('/api/admin/analytics',{method:'DELETE',body:JSON.stringify({baseRevision:saved.revision,confirm:'Statistik löschen'})})
    .then(async()=>{d.el.close();await load();if(view==='live')await loadLive();status(root,t("Die Webstatistik wurde gelöscht."));})
    .catch(error=>{status(d.body,error.message,true);erase.disabled=false;});
  });
  d.body.append(erase);
 }
 function filterDialog(){
  const d=dialog(root,t("Zeitraum und Filter"), t('Schließen')),form=node('form');
  const from=input(filters.from,'date'),to=input(filters.to,'date'),comparison=input('','checkbox');
  from.required=to.required=true;from.max=to.max=new Date().toISOString().slice(0,10);comparison.checked=filters.compare;
  const device=select([['',t("Alle Geräte")],['desktop','Desktop'],['mobile',t("Smartphone")],['tablet','Tablet']],filters.device);
  const country=input(filters.country),url=input(filters.path),source=input(filters.source),campaign=input(filters.campaign);
  country.maxLength=2;country.placeholder='DE';url.placeholder='/websites';source.placeholder='google.de';campaign.placeholder='sommer';
  const dates=node('div','','an-filter-fields');dates.append(field(t("Von"),from),field(t("Bis"),to),field(t("Gerät"),device),field(t("Land (Kürzel)"),country));
  const compareField=field(t("Mit dem Vorzeitraum vergleichen"),comparison);compareField.classList.add('cm-checks');
  const submit=node('button',t("Filter anwenden"),'cm-button cm-primary');submit.type='submit';
  form.append(dates,field(t("Seite (genauer Pfad)"),url),field(t("Herkunft (genauer Wert)"),source),field(t("Kampagne (UTM-Name)"),campaign),compareField,submit);
  d.body.append(form);
  form.onsubmit=event=>{
   event.preventDefault();
   if(from.value>to.value||Date.parse(to.value)-Date.parse(from.value)>365*86_400_000){status(d.body,t("Wählen Sie einen Zeitraum von höchstens 366 Tagen."),true);return;}
   filters={from:from.value,to:to.value,compare:comparison.checked,device:device.value,country:country.value.trim().toLowerCase()==='unbekannt'?'unbekannt':country.value.toUpperCase().trim(),path:url.value.trim(),source:source.value.trim(),campaign:campaign.value.trim()};
   d.el.close();void load();
  };
 }
 function toolbar(report:AnalyticsReport){
  const line=node('div','','an-toolbar'),ranges=group(t("Zeitraum")),filter=button(t("Zeitraum & Filter"),filterDialog);
  filter.dataset.focusKey='filters';
  const currentSpan=Math.round((Date.parse(filters.to)-Date.parse(filters.from))/86_400_000)+1;
  for(const days of [7,30,90])ranges.append(choice(t("{0} Tage", { 0: days }),'range-'+days,currentSpan===days,()=>setRange(days)));
  const tools=node('div','','an-toolbar-tools');tools.append(node('span',date(report.filters.from)+' – '+date(report.filters.to),'an-range'),filter);
  line.append(ranges,tools);root.append(line);
  const active=Object.entries(filters).filter(([key,value])=>['device','country','path','source','campaign'].includes(key)&&value);
  if(active.length){
   const chips=node('div','','an-filters');
   for(const [key,value] of active){const remove=button(String(value)+' ×',()=>changeFilter(key as keyof AnalyticsFilters,''));remove.setAttribute('aria-label',t("Filter {0} entfernen", { 0: String(value) }));chips.append(remove);}
   root.append(chips);
  }
 }
 function overview(report:Workspace['report'],s:Settings){
  toolbar(report);
  if(!s.enabled)root.append(node('p',s.everEnabled?t("Die Messung ist pausiert. Bisherige Daten bleiben innerhalb der Aufbewahrungsfrist sichtbar."):t("Die Webstatistik ist aus. Unter „Einrichten“ können Sie die freiwillige Messung einschalten."),'an-note'));
  if(!report.current.views&&s.enabled)root.append(node('p',t("Für diesen Zeitraum gibt es noch keine Seitenaufrufe mit Statistik-Einwilligung."),'an-note'));
  const metrics=node('div','','an-metrics');
  const primary:Array<[keyof AnalyticsMetrics,string,string]>=[
   ['visitors','Besucher','Unterschiedliche pseudonyme Browserkennungen im Zeitraum.'],
   ['visits','Besuche','Sitzungen mit mindestens einem passenden Seitenaufruf.'],
   ['views','Seitenaufrufe','Aufgerufene öffentliche Seiten, ohne URL-Parameter.'],
   ['engagedSeconds','Aktive Zeit / Besuch','Durchschnittliche aktive Lesezeit pro Besuch.'],
  ];
  for(const [key,label,hint] of primary)metrics.append(metric(t(label),formatMetric(key,report.current[key]),t(hint),compare(key,report.current[key],report.previous?.[key])));
  root.append(metrics);
  const chart=card(t("Besuchsverlauf"),'Aktivität'),heading=node('div','','an-card-actions'),switcher=group(t("Diagrammwert"));
  for(const [key,label] of [['views','Aufrufe'],['visits','Besuche']] as const)switcher.append(choice(t(label),'series-'+key,series===key,()=>{series=key;render();}));
  const csv=button(t("CSV laden"),()=>downloadReport(report));
  heading.append(switcher,csv);
  const legend=node('div','','an-legend');legend.append(tag(t("Gewählter Zeitraum"),'an-current'));
  if(report.previous)legend.append(tag(t("Vorzeitraum"),'an-prior'));
  else if(filters.compare)legend.append(node('span',t("Vergleich außerhalb der Aufbewahrungsfrist"),'an-muted'));
  chart.append(heading,trendChart(report,series),legend);root.append(chart);
  const quality=node('div','','an-metrics an-secondary');
  for(const [key,label,hint] of [
   ['visitDepth','Seiten pro Besuch','Durchschnittliche Seitenaufrufe pro Besuch.'],
   ['returningVisitors','Wiederkehrende','Browserkennungen mit mindestens zwei Besuchen im gewählten Zeitraum.'],
   ['bounceRate','Kurze Einzelbesuche','Ein Aufruf, weniger als 10 Sekunden aktive Lesezeit und keine erreichte Zielseite.'],
   ['conversionRate','Zielrate',t('{visits} Besuche haben eine konfigurierte Zielseite erreicht.', { visits: report.current.conversions })],
  ] as const)quality.append(metric(t(label),formatMetric(key,report.current[key]),t(hint),compare(key,report.current[key],report.previous?.[key])));
  root.append(quality);
  const board=node('section','','an-board'),menu=group(t("Aufschlüsselung")),grid=node('div','','an-details-grid');
  for(const [key,label] of [['pages','Seiten'],['acquisition','Herkunft'],['audience','Publikum'],['goals','Ziele']] as const)menu.append(choice(t(label),'breakdown-'+key,kind===key,()=>{kind=key;render();}));
  board.append(node('h2',t("Im Detail")),menu,grid);
  if(kind==='pages')grid.append(breakdown(t("Beliebte Seiten"),report.pages,pageName,name=>changeFilter('path',name)),
   breakdown(t("Einstiegsseiten"),report.entries,pageName),breakdown(t("Letzte erfasste Seiten"),report.exits,pageName));
  if(kind==='acquisition')grid.append(breakdown(t("Herkunft"),report.sources,sourceName,name=>changeFilter('source',name)),
   breakdown(t("Kampagnen"),report.campaigns,undefined,name=>changeFilter('campaign',name)));
  if(kind==='audience')grid.append(breakdown(t("Geräte"),report.devices,name=>deviceNames[name]?t(deviceNames[name]):name,name=>changeFilter('device',name)),
   breakdown('Browser',report.browsers),breakdown(t("Länder"),report.countries,countryName,name=>changeFilter('country',name)));
  if(kind==='goals'){
   const goalNames=new Map(s.goals.map(goal=>[goal.id,goal.label]));
   grid.append(breakdown(t("Erreichte Zielseiten"),report.goals,name=>goalNames.get(name)??name));
   if(report.outcomes?.length){
    const names:Record<string,string>={contact:'Kontaktanfragen',partnership:'Kooperationen',purchase:'Käufe',appointment:'Termine',offer:'Angebote'};
    grid.append(breakdown(t("Erfasste Ergebnisse"),report.outcomes.map(result=>({name:names[result.kind]?t(names[result.kind]):result.kind,value:result.count}))));
   }
  }
  root.append(board,node('p',t("Die Auswertung berücksichtigt Einwilligungen für Statistik. Zeitangaben im Zeitraum beziehen sich auf UTC."),'an-footnote'));
 }
 function drawLive(){
  if(!liveBody||view!=='live')return;
  liveBody.replaceChildren();
  if(!live){liveBody.append(node('p',t(liveError)||t("Aktivität wird geladen …"),liveError?'an-note an-error':'an-note'));return;}
  const hero=node('section','','an-live-hero'),left=node('div','','an-live-main'),activity=node('div','','an-live-activity');
  const label=tag(live.enabled?t("Live · letzte {0} Min.", { 0: live.windowMinutes }):t("Webstatistik pausiert"),live.enabled?'an-live-dot':'');
  left.append(label,node('h2',t("Gerade aktive Besucher")),node('strong',live.enabled?number(live.visitors):'–','an-live-value'));
  left.append(node('p',t("Browser mit mindestens einem Statistik-Signal im Zeitfenster."),'an-live-explain'));
  activity.append(node('h3',t("Letztes Signal je Besucher")));
  const bars=node('div','','an-live-bars'),max=Math.max(1,...live.activity.map(item=>item.visitors));
  for(const item of live.activity){
   const column=node('div','','an-live-column'),bar=node('span','','an-live-bar');
   column.append(node('strong',number(item.visitors)));bar.style.setProperty('--fill',item.visitors/max*100+'%');
   column.append(bar,node('small',item.minutesAgo?'−'+item.minutesAgo+' min':t("Jetzt")));bars.append(column);
  }
  activity.append(bars,node('p',liveError?t("Letzter Stand · {0}", { 0: clock(live.observedAt) }):t("Stand {0} · aktualisiert alle 20 s", { 0: clock(live.observedAt) }),'an-live-explain'));
  hero.append(left,activity);liveBody.append(hero);
  if(liveError)liveBody.append(node('p',t(liveError),'an-note an-error'));
  if(!live.enabled){liveBody.append(node('p',t("Sobald die freiwillige Webstatistik aktiv ist, zeigt die Live-Ansicht aktuelle Signale."),'an-note'));return;}
  const indicators=node('div','','an-metrics an-live-indicators');
  indicators.append(metric(t("Aktive Besuche"),number(live.visits),t("Sitzungen mit mindestens einem Signal in den letzten fünf Minuten.")),
   metric(t("Neu gestartet"),number(live.newVisits),t("Aktive Sitzungen, die in diesem Zeitfenster begonnen haben.")));
  const grids=node('div','','an-details-grid');
  grids.append(breakdown(t("Zuletzt aufgerufene Seiten"),live.pages,pageName),breakdown(t("Geräte"),live.devices,name=>deviceNames[name]?t(deviceNames[name]):name),breakdown(t("Herkunft"),live.sources,sourceName));
  liveBody.append(indicators,grids);
 }
 function mailOverview(workspace:Workspace){
  const mail=workspace.newsletter;
  if(!mail?.active)return;
  toolbar(workspace.report);
  const intro=card(t("Newsletter im Zeitraum"),'Eigene Auswertung');
  intro.append(node('p',t("{0} derzeit bestätigte Empfänger. Newsletter-Zahlen richten sich nach dem Zeitraum in Europe/Berlin.", { 0: number(mail.confirmed) }),'an-muted'));
  const grid=node('div','','an-metrics'),labels:Array<[keyof Metrics,string,string]>=[
   ['requested','Anmeldungen','Bestätigungen wurden per E-Mail angefragt.'],
   ['confirmed','Bestätigungen','Die Anmeldung wurde per E-Mail bestätigt.'],
   ['sent','Angenommen','Der Mailserver hat die Zustellung angenommen.'],
   ['unsubscribed','Abmeldungen','Der Versand an diese Adressen wurde beendet.'],
  ];
  for(const [key,label,hint] of labels)grid.append(metric(t(label),number(mail.totals[key]),t(hint)));
  intro.append(grid);root.append(intro);
 }
 function render(){
  const active=document.activeElement instanceof HTMLElement&&root.contains(document.activeElement)?document.activeElement.dataset.focusKey:undefined;
  root.replaceChildren();
  const header=node('header','','an-header'),intro=node('div'),actions=node('div','','an-header-actions');
  intro.append(node('p',t("Website · Auswertung"),'an-kicker'),node('h1',t("Webanalyse")),node('p',t("Besuche verstehen. Entwicklungen im Blick behalten."),'an-subtitle'));
  const reload=button(t("Aktualisieren"),refresh),setup=button(t("Einrichten"),settings);
  reload.dataset.focusKey='reload';setup.dataset.focusKey='settings';setup.disabled=!data;
  actions.append(reload,setup);header.append(intro,actions);root.append(header);
  const menu=group(t("Ansicht")),bar=node('div','','an-nav');
  menu.append(choice(t("Übersicht"),'tab-overview',view==='overview',()=>chooseView('overview')),
   choice('Live','tab-live',view==='live',()=>chooseView('live')));
  if(data?.newsletter?.active)menu.append(choice('Newsletter','tab-newsletter',view==='newsletter',()=>chooseView('newsletter')));
  bar.append(menu);
  if(data)bar.append(tag(data.settings.enabled?t("Statistik aktiv"):t("Statistik aus"),data.settings.enabled?'an-online':''));
  root.append(bar);
  liveBody=undefined;
  if(view==='live'){liveBody=node('div','','an-live-body');root.append(liveBody);drawLive();}
  else if(!data)root.append(node('p',t("Auswertung wird geladen …"),'an-note'));
  else if(view==='newsletter')mailOverview(data);
  else overview(data.report,data.settings);
  if(active)Array.from(root.querySelectorAll<HTMLElement>('[data-focus-key]')).find(item=>item.dataset.focusKey===active)?.focus({preventScroll:true});
 }
 render();void load();document.addEventListener('visibilitychange',visibility);
 return {
  setCopy(next) { copy = next; num = new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }); countries = new Intl.DisplayNames([locale()], { type: 'region' }); render(); },
  dispose() { disposed = true; stopLive(); reportAbort?.abort(); document.removeEventListener('visibilitychange', visibility); root.replaceChildren(); },
 };
}
