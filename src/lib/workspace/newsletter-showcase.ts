import {defaultAnalyticsFilters,type AnalyticsSession} from '../analytics/model';
import {buildAnalyticsReport} from '../analytics/report';

const format=new Intl.NumberFormat('de-DE');
const end=new Date('2026-10-30T23:59:59Z');
const date=(days:number)=>new Date(+end-days*86400_000);
const styles={
 standard:{brand:'Musterstudio',paths:['/','/leistungen','/projekte','/kontakt'],sources:['direkt','google.de','newsletter'],editions:['Ein Blick in die Werkstatt','Materialien, die wir gern verarbeiten – und ein Projekt, das gerade Form annimmt.','Was im Studio entsteht','Einblicke in aktuelle Projekte, neue Arbeiten und freie Termine.']},
 creators:{brand:'Creator-Beispiel',paths:['/','/videos','/live','/shop'],sources:['instagram.com','direkt','youtube.com'],editions:['Der nächste Drop steht an','Eine Vorschau aufs neue Merch, dazu die Termine für den nächsten Stream.','Diese Woche bei Mika','Highlights aus dem letzten Stream und was als Nächstes ansteht.']},
};
type Theme=keyof typeof styles;
function samples(theme:Theme):AnalyticsSession[]{
 const {paths,sources}=styles[theme];
 return Array.from({length:60},(_,i)=>Array.from({length:9+(i*17%22)+Math.floor((60-i)/5)},(_,j)=>{
  const id=i+'-'+j,time=new Date(+date(i)-j*86_000).toISOString();
  const path=paths[(i+j)%paths.length];
  const pages=[{id,path,enteredAt:time,engagedMs:(1+(i+j*3)%82)*1000,goals:[]}];
  if(j%4===0)pages.push({id:id+'-2',path:paths[(i+j+1)%paths.length],enteredAt:time,engagedMs:18_000,goals:[]});
  return {id,visitor:j%6?id:'returning-'+j,startedAt:time,updatedAt:time,generation:1,device:(['mobile','desktop','mobile','tablet'] as const)[(j+i)%4],browser:j%2?'Safari':'Chrome',country:'DE',source:sources[(j*i+j+i)%sources.length],campaign:'',medium:'',pages};
 })).flat();
}
function create<K extends keyof HTMLElementTagNameMap>(tag:K,className='',text=''){
 const element=document.createElement(tag);
 if(className)element.className=className;
 if(text)element.textContent=text;
 return element;
}

export function mountNewsletterShowcase(root:HTMLElement,theme:Theme){
 const content=styles[theme],sessions=samples(theme);
 const controls=create('div','nl-showcase-controls'),switcher=create('div','nl-showcase-switcher');
 const screen=create('div','nl-showcase-screen');
 const analytics=create('button','','Webanalyse'),newsletter=create('button','','Newsletter');
 analytics.type=newsletter.type='button';
 switcher.append(analytics,newsletter);
 controls.append(switcher,create('span','nl-showcase-label','Beispieldaten'));
 root.dataset.showcaseTheme=theme;
 root.replaceChildren(controls,screen);
 let range=30,device='',edition=0;
 function choose(active:HTMLButtonElement){
  for(const button of [analytics,newsletter])button.setAttribute('aria-pressed',String(button===active));
  if(active===analytics)showReport();else showEdition();
 }
 function showReport(){
  const options=create('div','nl-showcase-options'),period=create('select'),devices=create('select');
  for(const days of [7,30])period.add(new Option('Letzte '+days+' Tage',String(days)));
  for(const [label,key] of [['Alle Geräte',''],['Smartphones','mobile'],['Desktop','desktop'],['Tablets','tablet']])devices.add(new Option(label,key));
  period.setAttribute('aria-label','Beispielzeitraum');period.value=String(range);
  devices.setAttribute('aria-label','Gerät in der Beispielauswertung');devices.value=device;
  options.append(period,devices);
  const result=create('div','nl-showcase-result');result.setAttribute('aria-live','polite');
  function draw(){
   const filters={...defaultAnalyticsFilters(end),from:date(range-1).toISOString().slice(0,10),device};
   const report=buildAnalyticsReport(sessions,filters,90,end),metrics=create('dl','nl-showcase-metrics');
   for(const [label,value] of [['Besucher',format.format(report.current.visitors)],['Seitenaufrufe',format.format(report.current.views)],['Aktive Zeit / Besuch',report.current.engagedSeconds+' s']]){
    const cell=create('div');cell.append(create('dt','',label),create('dd','',value));metrics.append(cell);
   }
   const data=create('div','nl-showcase-data'),chart=create('figure','nl-showcase-figure');
   const legend=create('figcaption','','Seitenaufrufe im Verlauf');
   const series=document.createElementNS('http://www.w3.org/2000/svg','svg');
   series.setAttribute('viewBox','0 0 420 116');series.setAttribute('preserveAspectRatio','none');series.setAttribute('role','img');
   series.setAttribute('aria-label','Beispielverlauf. Höchster Tageswert: '+Math.max(...report.days.map(item=>item.views))+' Aufrufe.');
   for(const y of [12,43,74,105]){
    const line=document.createElementNS(series.namespaceURI,'line');line.setAttribute('x1','0');line.setAttribute('x2','420');line.setAttribute('y1',String(y));line.setAttribute('y2',String(y));line.setAttribute('stroke','currentColor');line.setAttribute('opacity','.12');series.append(line);
   }
   const max=Math.max(1,...report.days.flatMap(item=>[item.views,item.previousViews]));
   for(const key of ['previousViews','views'] as const){
    const line=document.createElementNS(series.namespaceURI,'polyline');
    line.setAttribute('points',report.days.map((item,i)=>i/(range-1)*420+','+(105-item[key]/max*93)).join(' '));
    line.setAttribute('fill','none');line.setAttribute('stroke','currentColor');line.setAttribute('stroke-width','2');line.setAttribute('vector-effect','non-scaling-stroke');
    line.setAttribute('stroke-linejoin','round');line.setAttribute('stroke-linecap','round');
    if(key==='previousViews'){line.setAttribute('stroke-dasharray','5 6');line.setAttribute('opacity','.4');}
    series.append(line);
   }
   const key=create('div','nl-showcase-key');key.append(create('span','','Aktuell'),create('span','','Vorzeitraum'));
   chart.append(legend,series,key);
   const sources=create('div','nl-showcase-sources');
   sources.append(create('h3','','Häufigste Herkunft'));
   const list=create('ul');
   for(const item of report.sources.slice(0,3)){
    const row=create('li');row.append(create('span','',item.name==='direkt'?'Direkt':item.name==='newsletter'?'Newsletter':item.name),create('strong','',format.format(item.value)));list.append(row);
   }
   sources.append(list);data.append(chart,sources);
   result.replaceChildren(metrics,data);
  }
  period.onchange=()=>{range=Number(period.value);draw();};
  devices.onchange=()=>{device=devices.value;draw();};
  screen.replaceChildren(options,result);draw();
 }
 function showEdition(){
  const options=create('div','nl-showcase-options'),audience=create('select'),mail=create('article','nl-showcase-letter');
  audience.setAttribute('aria-label','Empfängergruppe der Beispielausgabe');
  audience.add(new Option('Alle Abonnenten','0'));
  audience.add(new Option(theme==='creators'?'Gruppe: Stream & Community':'Gruppe: Studio-Updates','1'));
  audience.value=String(edition);
  function draw(){
   const label=create('div','nl-showcase-letter-brand',content.brand),title=create('h3','',content.editions[edition*2]);
   const note=create('p','',content.editions[edition*2+1]),rule=create('div','nl-showcase-letter-rule');
   const count=create('p','nl-showcase-mail-note',edition?'86 bestätigte Empfänger':'248 bestätigte Empfänger');
   const flow=create('div','nl-showcase-flow');
   const list=create('ol');
   for(const item of ['Anmelden','E-Mail bestätigen','Ausgabe erhalten'])list.append(create('li','',item));
   flow.append(count,list);
   mail.replaceChildren(label,title,note,rule,flow);
  }
  audience.onchange=()=>{edition=Number(audience.value);draw();};
  options.append(audience);screen.replaceChildren(options,mail);draw();
 }
 analytics.onclick=()=>choose(analytics);newsletter.onclick=()=>choose(newsletter);
 choose(analytics);
 return ()=>root.replaceChildren();
}
