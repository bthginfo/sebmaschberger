import {defaultDesign,type Block,type CampaignDraft,type CampaignView,type Group,type NewsletterCommand,type SubscriberView,type Workspace} from '../newsletter/model';
import {renderCampaign} from '../newsletter/render';
import {button,detail,dialog,field,input,node,request,select,status} from './panel';
import type { WorkspaceCopy, WorkspacePanel } from './panel';

const endpoint='/api/admin/newsletter';
const campaignLabels={draft:'Entwurf',queued:'Im Versand',finished:'Abgeschlossen',stopped:'Gestoppt'};
const subscriberLabels={pending:'Bestätigung ausstehend',confirmed:'Bestätigt',unsubscribed:'Abgemeldet'};
const blockLabels={text:'Text',image:'Bild',button:'Button',rule:'Trenner'};
function block(type:Block['type']):Block{
 const id=crypto.randomUUID();
 if(type==='text')return {id,type,heading:'',body:''};
 if(type==='image')return {id,type,src:'',alt:''};
 if(type==='button')return {id,type,label:'Mehr erfahren',href:'/'};
 return {id,type};
}
function newDraft():CampaignDraft{
 return {id:crypto.randomUUID(),revision:0,subject:'',preview:'',design:{...defaultDesign},blocks:[block('text')],groupIds:[],tagLinks:true};
}
const check=(label:string,value:boolean,change:(on:boolean)=>void)=>{
 const element=input('','checkbox');element.checked=value;element.addEventListener('change',()=>change(element.checked));
 const wrapper=node('label','','nl-checkbox');wrapper.append(element,node('span',label));return wrapper;
};
function bound(label:string,value:string,change:(value:string)=>void,options:{max?:number;multiline?:boolean;type?:string}={}){
 const element=options.multiline?node('textarea'):input(value,options.type);
 element.value=value;
 if(options.max)element.maxLength=options.max;
 if(element instanceof HTMLTextAreaElement)element.rows=5;
 element.addEventListener('input',()=>change(element.value));
 return field(label,element);
}
function badge(text:string){return node('span',text,'nl-badge');}

export function mountNewsletterPanel(root:HTMLElement, initialCopy: WorkspaceCopy): WorkspacePanel {
 let copy = initialCopy;
 const t: WorkspaceCopy['t'] = (message, values) => copy.t(message, values);
 const locale = () => copy.language === 'en' ? 'en-GB' : 'de-DE';
 const time = (value: string) => new Date(value).toLocaleDateString(locale(), { dateStyle: 'medium' });
 const number = (value: number) => new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(value);
 root.classList.add('cm-workspace','nl-workspace');
 let data:Workspace|undefined,draft:CampaignDraft|undefined,selected:string|undefined;
 let view:'campaigns'|'audience'|'settings'='campaigns',device:'desktop'|'mobile'='desktop';
 let dirty=false,busy=false,disposed=false,previewFrame=0,limit=24,query='';
 let settingsProvider='',settingsEnabled=false;
 const beforeUnload=(event:BeforeUnloadEvent)=>{if(dirty)event.preventDefault();};
 window.addEventListener('beforeunload',beforeUnload);
 const notify=(message:string,error=false)=>{if(!disposed)status(root,t(message),error);};
 async function load(){
  const next=await request<Workspace>(endpoint);
  if(disposed)return;
  data=next;settingsProvider=next.settings.provider;settingsEnabled=next.settings.enabled;
  if(selected)choose(selected);
  render();
 }
 async function act(command:NewsletterCommand,message:string,update=true){
  if(busy)return false;
  busy=true;root.setAttribute('aria-busy','true');
  try{
   const next=await request<Workspace&{wakePending?:boolean}>(endpoint,{method:'POST',body:JSON.stringify(command)});
   if(disposed)return false;
   data=next;
   if(update&&selected)choose(selected);
   if(command.action==='settings'){settingsProvider=next.settings.provider;settingsEnabled=next.settings.enabled;}
   render();notify(next.wakePending?t("Gespeichert. Der Hintergrundversand wird erneut angestoßen."):message);
   return true;
  }catch(error){notify(error instanceof Error?error.message:t("Der Vorgang konnte nicht abgeschlossen werden."),true);return false;}
  finally{busy=false;root.removeAttribute('aria-busy');}
 }
 function choose(id?:string){
  selected=id;
  const current=data?.campaigns.find(item=>item.id===id);
  if(current){
   const {subject,preview,design,blocks,groupIds,tagLinks,revision}=current;
   draft=structuredClone({id:current.id,subject,preview,design,blocks,groupIds,tagLinks,revision});
  }else draft=undefined;
  dirty=false;
 }
 function discard(){
  return !dirty||window.confirm(t("Ungespeicherte Änderungen am Entwurf verwerfen?"));
 }
 function changeView(next:typeof view){
  if(next===view||!discard())return;
  if(dirty)choose(selected);
  view=next;render();
 }
 function refreshPreview(){
  cancelAnimationFrame(previewFrame);
  previewFrame=requestAnimationFrame(()=>{
   const frame=root.querySelector<HTMLIFrameElement>('[data-newsletter-preview]');
   if(frame&&data&&draft)frame.srcdoc=renderCampaign(draft,data.brand,'#').html;
   const send=root.querySelector<HTMLButtonElement>('[data-newsletter-send]');
   const saved=data?.campaigns.find(item=>item.id===selected);
   if(send)send.disabled=dirty||!data?.settings.enabled||!data.mailReady||!saved?.audience;
   const save=root.querySelector<HTMLButtonElement>('[data-newsletter-save]');
   if(save)save.disabled=!dirty;
  });
 }
 function changed(){dirty=true;refreshPreview();}
 function confirmAction(title:string,message:string,callToAction:string,run:()=>Promise<boolean>){
  const {el,body}=dialog(root,title, t('Schließen'));
  const execute=button(callToAction,()=>{execute.disabled=true;void run().then(ok=>{if(ok)el.close();else{execute.disabled=false;const warning=root.querySelector(':scope > .cm-error');if(warning)status(body,warning.textContent??t("Bitte erneut prüfen."),true);}});},true);
  body.append(node('p',message),execute);
 }
 function groupChecks(groupIds:string[],change:(ids:string[])=>void){
  const choices=node('div','','nl-check-list');
  for(const group of data!.groups)choices.append(check(group.name,groupIds.includes(group.id),on=>{
   const updated=on?[...groupIds,group.id]:groupIds.filter(id=>id!==group.id);
   groupIds=updated;change(updated);
  }));
  return choices;
 }
 function blockEditor(item:Block,index:number){
  const container=node('fieldset','','nl-block');
  container.append(node('legend',(index+1)+' · '+t(blockLabels[item.type])));
  if(item.type==='text')container.append(
   bound(t("Überschrift"),item.heading,value=>{item.heading=value;changed();},{max:160}),
   bound('Text',item.body,value=>{item.body=value;changed();},{max:4200,multiline:true}));
  if(item.type==='image')container.append(
   bound(t("Bildadresse aus der Medienbibliothek"),item.src,value=>{item.src=value;changed();},{max:1500}),
   bound(t("Alternativtext"),item.alt,value=>{item.alt=value;changed();},{max:300}));
  if(item.type==='button')container.append(
   bound(t("Button-Text"),item.label,value=>{item.label=value;changed();},{max:70}),
   bound(t("Zieladresse"),item.href,value=>{item.href=value;changed();},{max:1500}));
  const row=node('div','','nl-row');
  for(const [label,offset] of [['Nach oben',-1],['Nach unten',1]] as const){
   const move=button(t(label),()=>{const blocks=draft!.blocks;[blocks[index],blocks[index+offset]]=[blocks[index+offset],blocks[index]];changed();render();});
   move.disabled=index+offset<0||index+offset>=draft!.blocks.length;row.append(move);
  }
  row.append(button(t("Entfernen"),()=>{draft!.blocks.splice(index,1);changed();render();}));
  container.append(row);return container;
 }
 function composer(current?:CampaignView){
  const editor=node('section','','nl-editor'),actions=node('div','','nl-row');
  const saved=current?.status??'draft',editable=saved==='draft';
  const title=node('div','','nl-row nl-between');
  title.append(node('h2',draft!.subject||t("Neue Ausgabe")),badge(t(campaignLabels[saved])));
  editor.append(title);
  if(!editable&&current){
   editor.append(node('p',t("{0} angenommen · {1} Empfänger beim Start", { 0: number(current.counts.sent), 1: number(current.audience) }),'nl-muted'));
   const more=Object.entries(current.counts).filter(([key,value])=>key!=='sent'&&value>0)
    .map(([key,value])=>value+' '+t({queued:'wartend',sending:'in Zustellung',failed:'abgewiesen',skipped:'übersprungen',uncertain:'ungeklärt'}[key]??key));
   if(more.length)editor.append(node('p',more.join(' · '),'nl-muted'));
   if(saved==='queued'){
    actions.append(button(t("Versandstatus laden"),()=>void load().catch(error=>notify(error.message,true))));
    actions.append(button(t("Versand fortsetzen"),()=>void act({action:'pump'},t("Versand angestoßen."))));
    actions.append(button(t("Versand stoppen"),()=>confirmAction(t("Versand stoppen"),t("Ausstehende Zustellungen werden übersprungen. Bereits übergebene E-Mails bleiben zugestellt."),t("Ausstehende E-Mails stoppen"),()=>act({action:'stop',id:current.id,revision:current.revision},t("Versand gestoppt.")))));
   }
   editor.append(actions);return editor;
  }
  editor.append(
   bound(t("Betreff"),draft!.subject,value=>{draft!.subject=value;changed();},{max:150}),
   bound(t("Vorschautext im Posteingang"),draft!.preview,value=>{draft!.preview=value;changed();},{max:175}),
  );
  const blocks=node('div','','nl-blocks');blocks.append(node('h3',t("Inhalt")));
  for(const [index,item] of draft!.blocks.entries())blocks.append(blockEditor(item,index));
  const add=node('div','','nl-row');
  for(const type of Object.keys(blockLabels) as Block['type'][]){
   const control=button('+ '+t(blockLabels[type]),()=>{draft!.blocks.push(block(type));changed();render();});
   control.disabled=draft!.blocks.length>=24;add.append(control);
  }
  blocks.append(add);editor.append(blocks);
  const design=node('details','','nl-settings');
  design.append(node('summary',t("Design und Farben")));
  const colors=node('div','','nl-colors');
  for(const [key,name] of [['accent','Akzent'],['background','Hintergrund'],['paper','Mail-Fläche'],['ink','Textfarbe']] as const)
   colors.append(bound(t(name),draft!.design[key],value=>{draft!.design[key]=value;changed();},{type:'color'}));
  const font=select([['modern','Modern'],['editorial','Serif']],draft!.design.font);
  font.addEventListener('change',()=>{draft!.design.font=font.value==='editorial'?'editorial':'modern';changed();});
  const radius=select([['soft',t("Abgerundet")],['square',t("Gerade")]],draft!.design.radius);
  radius.addEventListener('change',()=>{draft!.design.radius=radius.value==='square'?'square':'soft';changed();});
  design.append(colors,field(t("Schrift"),font),field(t("Ecken"),radius));editor.append(design);
  const audience=node('details','','nl-settings');
  audience.append(node('summary',t("Empfänger und Website-Links")),node('p',t("Wählen Sie Gruppen aus oder lassen Sie die Auswahl leer, um alle bestätigten Empfänger zu erreichen."),'nl-muted'),
   groupChecks(draft!.groupIds,ids=>{draft!.groupIds=ids;changed();}),
   check(t("Website-Links mit Kampagnenname versehen"),draft!.tagLinks,value=>{draft!.tagLinks=value;changed();}),
   node('p',t("Der Kampagnenname gilt für alle Empfänger. Die Website zählt Besuche erst nach Statistik-Einwilligung."),'nl-muted'));
  editor.append(audience);
  const save=button(t("Entwurf speichern"),()=>{if(!draft!.subject.trim()){notify(t("Geben Sie der Ausgabe einen Betreff."),true);return;}selected=draft!.id;void act({action:'campaign',campaign:structuredClone(draft!)},t("Entwurf gespeichert."));},true);
  save.disabled=!dirty;save.dataset.newsletterSave='';actions.append(save);
  if(current){
   const send=button(t("Versand freigeben"),()=>confirmAction(t("Ausgabe versenden"),
    t("„{0}“ wird an {1} bestätigte Empfänger versendet.", { 0: current.subject, 1: number(current.audience) }),
    t("Jetzt verbindlich freigeben"),()=>act({action:'queue',id:current.id,revision:current.revision,confirmedCount:current.audience},t("Die Ausgabe wurde für den Versand freigegeben."))));
   send.dataset.newsletterSend='';actions.append(send);
   actions.append(button(t("Entwurf löschen"),()=>confirmAction(t("Entwurf löschen"),t("Diese Ausgabe wird aus dem Arbeitsbereich entfernt."),t("Entwurf löschen"),async()=>{
    const ok=await act({action:'remove-campaign',id:current.id,revision:current.revision},t("Entwurf gelöscht."));
    if(ok){choose();render();}return ok;
   })));
  }
  editor.append(actions);
  return editor;
 }
 function campaigns(){
  const wrapper=node('div','','nl-compose'),list=node('aside','','nl-list');
  list.append(node('h2',t("Ausgaben")),button(t("Neue Ausgabe"),()=>{
   if(!discard())return;choose();draft=newDraft();dirty=true;render();
  },true));
  if(!data!.campaigns.length)list.append(node('p',t("Ihre Entwürfe und versendeten Ausgaben erscheinen hier."),'nl-muted'));
  for(const item of data!.campaigns){
   const link=button(item.subject,()=>{if(!discard())return;choose(item.id);render();});
   link.classList.add('nl-list-item');link.setAttribute('aria-pressed',String(item.id===selected));
   link.append(badge(t(campaignLabels[item.status])));list.append(link);
  }
  wrapper.append(list);
  if(!draft){const empty=node('section','','nl-editor');empty.append(node('h2',t("Eine Ausgabe beginnt hier")),node('p',t("Sammeln Sie Ihre Neuigkeiten in einer E-Mail und sehen Sie sich das Ergebnis vor dem Versand an."),'nl-muted'));wrapper.append(empty);return wrapper;}
  const current=data!.campaigns.find(item=>item.id===selected),preview=node('aside','','nl-preview');
  preview.append(node('h2',t("E-Mail-Vorschau")));
  const controls=node('div','','nl-row');
  for(const [mode,label] of [['desktop','Desktop'],['mobile','Mobil']] as const){
   const toggle=button(label,()=>{device=mode;render();});toggle.setAttribute('aria-pressed',String(device===mode));controls.append(toggle);
  }
  const iframe=node('iframe');iframe.title=t("Vorschau der Newsletter-Ausgabe");iframe.setAttribute('sandbox','');iframe.dataset.newsletterPreview='';
  iframe.classList.toggle('nl-mobile-frame',device==='mobile');
  preview.append(controls,iframe);
  wrapper.append(composer(current),preview);return wrapper;
 }
 function groupEditor(group?:Group){
  const {el,body}=dialog(root,group?t("Gruppe bearbeiten"):t("Neue Gruppe"), t('Schließen')),name=input(group?.name??'');
  name.maxLength=72;
  let isPublic=group?.public??false;
  body.append(field(t("Gruppenname"),name),check(t("Für Anmelde-Abschnitte auswählbar"),isPublic,value=>isPublic=value),node('p',t("Öffentliche Gruppen können in einem Anmelde-Abschnitt als Thema gewählt werden."),'nl-muted'));
  body.append(button(t("Speichern"),()=>{
   if(!name.value.trim()){status(body,t("Geben Sie der Gruppe einen Namen."),true);return;}
   void act({action:'group',group:{id:group?.id??crypto.randomUUID(),revision:group?.revision??0,name:name.value,public:isPublic}},t("Gruppe gespeichert.")).then(ok=>{if(ok)el.close();else status(body,root.querySelector('.cm-error')?.textContent??t("Bitte Eingaben prüfen."),true);});
  },true));
 }
 function personRow(person:SubscriberView){
  const row=node('details','','nl-person');
  const summary=node('summary');
  summary.append(node('span',person.email),badge(subscriberLabels[person.status]));
  row.append(summary);
  if(person.confirmedAt)row.append(node('p',t("Bestätigt am {0}{1}", { 0: time(person.confirmedAt), 1: person.source?' · '+person.source:'' }),'nl-muted'));
  if(person.status==='confirmed'&&data!.groups.length){
   let ids=[...person.groupIds];
   row.append(groupChecks(ids,next=>ids=next),button(t("Gruppen speichern"),()=>void act({action:'subscriber-groups',id:person.id,revision:person.revision,groupIds:ids},t("Gruppen gespeichert."))));
  }
  row.append(button(t("Adresse entfernen"),()=>confirmAction(t("Adresse entfernen"),t("Der Eintrag und sein Einwilligungsnachweis werden gelöscht. Eine neue Anmeldung beginnt wieder mit einer Bestätigung."),t("Adresse löschen"),()=>act({action:'remove-subscriber',id:person.id,revision:person.revision},t("Adresse entfernt.")))));
  return row;
 }
 function audience(){
  const layout=node('div','','nl-audience'),people=node('section','','nl-editor'),groups=node('section','','nl-editor');
  const search=input(query,'search'),list=node('div','','nl-person-list');
  const fill=()=>{
   const filtered=data!.subscribers.filter(person=>person.email.toLowerCase().includes(query.toLowerCase()));
   list.replaceChildren(...filtered.slice(0,limit).map(personRow));
   if(!filtered.length)list.append(node('p',query?t("Keine passende Adresse."):t("Bestätigte, offene und abgemeldete Adressen erscheinen hier."),'nl-muted'));
   if(filtered.length>limit)list.append(button(t("Weitere Adressen anzeigen"),()=>{limit+=24;fill();}));
  };
  search.addEventListener('input',()=>{query=search.value;limit=24;fill();});fill();
  people.append(node('h2',t("Empfänger")),field(t("E-Mail-Adresse suchen"),search),list);
  groups.append(node('h2',t("Gruppen")),button(t("Neue Gruppe"),()=>groupEditor(),true));
  if(!data!.groups.length)groups.append(node('p',t("Gruppen helfen Ihnen, Ausgaben an passende Empfänger zu schicken."),'nl-muted'));
  for(const group of data!.groups){
   const item=node('div','','nl-group');
   item.append(node('strong',group.name),node('span',t("{0} bestätigt", { 0: number(data!.subscribers.filter(person=>person.status==='confirmed'&&person.groupIds.includes(group.id)).length) }),'nl-muted'));
   if(group.public){
    const key=input(group.id);key.readOnly=true;key.addEventListener('focus',()=>key.select());item.append(field(t("Kennung für den Anmelde-Abschnitt"),key));
   }
   const actions=node('div','','nl-row');
   actions.append(button(t("Bearbeiten"),()=>groupEditor(group)),button(t("Löschen"),()=>confirmAction(t("Gruppe löschen"),t("Die Adressen bleiben in der Empfängerliste. Der Gruppenfilter wird entfernt."),t("Gruppe löschen"),()=>act({action:'remove-group',id:group.id,revision:group.revision},t("Gruppe gelöscht.")))));
   item.append(actions);groups.append(item);
  }
  layout.append(people,groups);return layout;
 }
 function settings(){
  const card=node('section','','nl-editor nl-setup');
  card.append(node('h2',t("Newsletter einrichten")),
   badge(data!.mailReady?t("Mailversand und Absender bereit"):t("Mailversand oder Absender fehlen")),
   node('p',t("Absenderangaben: {0}", { 0: [data!.brand.legalName,data!.brand.email].filter(Boolean).join(' · ') }),'nl-muted'),
   bound(t("Name des Mailanbieters für den Datenschutz"),settingsProvider,value=>settingsProvider=value,{max:170}),
   check(t("Anmeldung und Versand aktivieren"),settingsEnabled,value=>settingsEnabled=value),
   button(t("Einstellungen speichern"),()=>void act({action:'settings',settings:{revision:data!.settings.revision,enabled:settingsEnabled,provider:settingsProvider}},t("Einstellungen gespeichert.")),true),
   detail(t("So kommt die Anmeldung auf Ihre Website"),t("Fügen Sie im Seiteneditor den Abschnitt „Newsletter-Anmeldung“ ein und veröffentlichen Sie die Seite. Eine Gruppenkennung ist optional. Nach der Anmeldung erhalten Interessierte eine E-Mail zur Bestätigung. Jede Ausgabe enthält einen Abmeldelink.")));
  return card;
 }
 function render(){
  if(disposed||!data)return;
  const heading=node('header','','nl-header'),tabs=node('nav','','nl-row nl-tabs');
  tabs.setAttribute('aria-label',t("Newsletter-Bereiche"));
  for(const [id,label] of [['campaigns','Ausgaben'],['audience','Empfänger & Gruppen'],['settings','Einrichtung']] as const){
   const tab=button(t(label),()=>changeView(id));tab.setAttribute('aria-current',view===id?'page':'false');tabs.append(tab);
  }
  heading.append(node('p',t("E-MAIL · CMS"),'nl-overline'),node('h1','Newsletter'),
   node('p',t("Ausgaben gestalten, Empfänger verwalten und bestätigte Kontakte erreichen."),'nl-muted'),tabs);
  root.replaceChildren(heading,view==='campaigns'?campaigns():view==='audience'?audience():settings());
  refreshPreview();
 }
 root.append(node('p',t("Newsletter wird geladen …"),'cm-initial-loading'));
 void load().catch(error=>notify(error.message,true));
 return {
  setCopy(next) { copy = next; render(); },
  dispose() { disposed = true; cancelAnimationFrame(previewFrame); window.removeEventListener('beforeunload', beforeUnload); root.replaceChildren(); },
 };
}
