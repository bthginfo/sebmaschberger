"use client";

import {useEffect,useId,useRef,useState,type CSSProperties} from 'react';
import {ArrowUpRight,Check,FilePlus2,Lightbulb,MessageSquareText,RotateCcw,SquarePen,Undo2,Waypoints} from 'lucide-react';
import type {ContentItem,Section,SiteConfig} from '@/lib/types';
import {ASSISTANT_TASKS,assistantPagePlanSchema,type AssistantContext,type AssistantKind,type AssistantPagePlan,type AssistantTarget} from '@/lib/assistant/model';
import {ContentLink,EditableText} from '@/components/site/editable';
import {useSectionHeadingLevel} from '@/components/site/heading-level';
import {Assistant} from './assistant';
import styles from './showcase.module.css';

type Props={section:Section;site:SiteConfig;editable?:boolean;selected?:boolean;onSelect?:()=>void;onChange?:(section:Section)=>void};
const icons={rewrite:SquarePen,page:FilePlus2,help:Waypoints,social:MessageSquareText,ideas:Lightbulb};
const kinds:AssistantKind[]=['rewrite','page','help','social','ideas'];

/** The same assistant used by the CMS, with a local editable draft instead of an admin API. */
export function AssistantShowcase({section,site,editable=false,selected,onSelect,onChange}:Props){
 const creator=site.modules?.creator?.enabled===true,heading=useSectionHeadingLevel(section.id),id=useId(),c=section.content;
 const items=c.items??[],example=items.find(item=>item.tags?.includes('example'));
 const [draft,setDraft]=useState(example?.text??''),[previous,setPrevious]=useState<string|null>(null),[task,setTask]=useState<AssistantKind>('rewrite'),[signal,setSignal]=useState(0),[reset,setReset]=useState(0),[notice,setNotice]=useState(''),[localPage,setLocalPage]=useState<AssistantPagePlan|null>(null);
 const availableSections=[{type:'hero',label:'Auftakt'},{type:'richtext',label:'Textabschnitt'},{type:'cta',label:'Nächster Schritt'}];
 const draftRef=useRef(draft);draftRef.current=draft;
 const source=example?.text??'';
 useEffect(()=>{setDraft(source);setPrevious(null);setLocalPage(null);setNotice('');setReset(value=>value+1);},[source,section.id]);
 const current=items.find(item=>item.tags?.includes(task));
 function field(key:'heading'|'subheading'|'text'|'caption',value:string){onChange?.({...section,content:{...c,[key]:value}});}
 function updateItem(item:ContentItem,key:'title'|'text'|'meta',value:string){onChange?.({...section,content:{...c,items:items.map(entry=>entry.id===item.id?{...entry,[key]:value}:entry)}});}
 function choose(kind:AssistantKind){setTask(kind);setSignal(value=>value+1);setNotice('');}
 function apply(text:string,target:AssistantTarget){if(target.id!==`${section.id}:example`||target.text!==draftRef.current)return false;setPrevious(draftRef.current);setDraft(text);setNotice(creator?'Dein Beispieltext ist aktualisiert.':'Ihr Beispieltext ist aktualisiert.');return true;}
 function createPage(plan:AssistantPagePlan,captured:AssistantContext){const parsed=assistantPagePlanSchema.safeParse(plan);if(!parsed.success)return{ok:false,error:parsed.error.issues[0]?.message||'Bitte den Seitenplan prüfen.'};if(captured.text!==draftRef.current)return{ok:false,error:'Der Beispieltext hat sich verändert. Bitte einen neuen Seitenplan erstellen.'};if(parsed.data.sections.some(section=>!availableSections.some(entry=>entry.type===section.type)))return{ok:false,error:'Ein Abschnitt ist für dieses Beispiel nicht verfügbar.'};if(localPage)return{ok:false,error:'Es gibt bereits einen lokalen Seitenentwurf. Entfernen Sie ihn vor einem neuen Versuch.'};setLocalPage(parsed.data);setNotice(creator?'Deine neue Seite ist als lokaler Entwurf angelegt.':'Die neue Seite ist als lokaler Entwurf angelegt.');return{ok:true};}
 const accent=section.design.accentColor|| (creator?'#d7ff44':site.theme.accent);
 const ink=creator?'#111525':site.theme.primary,paper=creator?'#f5f0e7':site.theme.background;
 const background=section.design.theme==='dark'?ink:section.design.theme==='accent'?accent:paper;
 const foreground=section.design.theme==='dark'?paper:ink;
 const style={'--showcase-accent':accent,'--showcase-scale':section.design.fontScale,'--showcase-radius':`${section.design.radius}px`,'--showcase-heading-font':section.design.headingFont==='sans'?'var(--font-body)':creator?"var(--kc-headline-font,'Barlow Condensed'),sans-serif":'var(--ws-display,var(--font-body))','--showcase-bg':section.design.background||background,'--showcase-fg':section.design.textColor||foreground} as CSSProperties;
 return <section id={section.anchor||section.id} data-section-id={section.id} data-section-type={section.type} data-audience={creator?'creator':'business'} data-spacing={section.design.spacing} data-width={section.design.width} data-align={section.design.align} className={`${styles.section}${editable?' ws-editable-section':''}${selected?' ws-section-selected':''}${!section.visible?' ws-section-hidden':''}`} style={style} onClick={editable?onSelect:undefined}>
  {editable&&<button className="ws-section-select" type="button" onClick={event=>{event.stopPropagation();onSelect?.();}}>{section.name}{!section.visible&&' · ausgeblendet'}</button>}
  <div className={styles.inner}>
   <header className={styles.intro}>
    <div><EditableText as="p" className={styles.eyebrow} value={c.subheading} editable={editable} onChange={value=>field('subheading',value)}/><EditableText as={heading} className={styles.heading} value={c.heading} editable={editable} onChange={value=>field('heading',value)}/></div>
    <EditableText as="p" className={styles.description} value={c.text} editable={editable} onChange={value=>field('text',value)}/>
   </header>
   <div className={styles.workspace}>
    <div className={styles.source}>
     <div className={styles.tasks} role="group" aria-label={creator?'Was soll dein Assistent vorbereiten?':'Was soll der Assistent vorbereiten?'}>
      {kinds.map(kind=>{const item=items.find(entry=>entry.tags?.includes(kind)),Icon=icons[kind];return <button type="button" key={kind} className={styles.task} aria-pressed={task===kind} onClick={()=>choose(kind)} disabled={editable}><Icon size={20}/><span><strong>{item?.title||ASSISTANT_TASKS.find(action=>action.kind===kind)!.label}</strong><span>{item?.text}</span></span><ArrowUpRight size={18}/></button>;})}
     </div>
     <div className={styles.draft}>
      <div className={styles.draftTop}><span>{creator?'Dein Arbeitsstand':'Ihr Arbeitsstand'}</span><span><i/>Lokaler Entwurf</span></div>
      <div className={styles.draftContent}>
       <EditableText as="span" className={styles.exampleName} value={example?.meta||site.name} editable={editable} onChange={value=>example&&updateItem(example,'meta',value)}/>
       <EditableText as="h3" value={example?.title} editable={editable} onChange={value=>example&&updateItem(example,'title',value)}/>
       {editable?<EditableText as="p" value={example?.text} editable onChange={value=>example&&updateItem(example,'text',value)}/>:<><label htmlFor={`${id}-source`} className={styles.sourceLabel}>Website-Text bearbeiten</label><textarea id={`${id}-source`} value={draft} maxLength={8000} rows={5} onChange={event=>{setPrevious(draft);setDraft(event.target.value);setNotice('');}}/></>}
      </div>
      {!editable&&<div className={styles.draftActions}><button type="button" disabled={previous===null} onClick={()=>{if(previous!==null){const old=draft;setDraft(previous);setPrevious(old);setNotice('Der vorherige Text ist wiederhergestellt.');}}}><Undo2 size={15}/>Rückgängig</button><button type="button" onClick={()=>{setDraft(source);setPrevious(null);setLocalPage(null);setReset(value=>value+1);setNotice('Beispiel zurückgesetzt.');}}><RotateCcw size={15}/>Zurücksetzen</button></div>}
      {notice&&<p className={styles.notice} role="status"><Check size={15}/>{notice}</p>}
     </div>
     {localPage&&<article className={styles.pagePreview} aria-label="Neu angelegter Seitenentwurf"><header><span><FilePlus2 size={15}/>Neue Seite · nur als Entwurf</span><button type="button" onClick={()=>{setLocalPage(null);setNotice('Der neue Seitenentwurf wurde rückgängig gemacht.');}}><Undo2 size={15}/>Rückgängig</button></header><div className={styles.pageAddress}>/{localPage.slug}</div><div>{localPage.sections.map((entry,index)=><section key={index}><span>{entry.type}</span><h3>{entry.heading}</h3><p>{entry.text}</p></section>)}</div></article>}
    </div>
    <div className={styles.assistant}>
     {editable?<div className={styles.editorNotice}><MessageSquareText size={28}/><strong>Eigenständiges KI-Beispiel</strong><p>Überschrift, Einleitung, Aufgaben und der Beispieltext sind CMS-Inhalte. Zum Ausprobieren die Vorschau öffnen.</p></div>:<Assistant key={`${section.id}:${reset}`} mode="demo" presentation="inline" taskControls={false} tone={creator?'du':'sie'} preset={{kind:task,prompt:current?.label,signal}} context={{brandName:example?.meta||site.name,pageTitle:example?.title,heading:example?.title,text:draft,addressing:creator?'du':'sie',availableSections,pageList:localPage?[{title:localPage.title,slug:localPage.slug}]:[],audience:creator?'Eine Community, die Livestreams und gemeinsame Inhalte entdecken möchte.':'Kundinnen und Kunden, die sich für die Leistungen eines kleinen Betriebs interessieren.'}} target={{id:`${section.id}:example`,text:draft}} onApplyText={apply} onCreatePage={createPage}/>}
    </div>
   </div>
   <footer className={styles.footer}><MessageSquareText size={17}/><EditableText as="p" value={c.caption} editable={editable} onChange={value=>field('caption',value)}/>{c.primaryLabel&&<ContentLink href={c.primaryHref} editField="primaryHref" editable={editable}>{c.primaryLabel}<ArrowUpRight size={16}/></ContentLink>}</footer>
  </div>
 </section>;
}
