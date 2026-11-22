"use client";

import {useEffect,useId,useRef,useState} from 'react';
import {ArrowRight,ArrowUpRight,Check,ChevronDown,Copy,FilePlus2,Lightbulb,LoaderCircle,MessageSquareText,RefreshCw,Send,SquarePen,Waypoints,X} from 'lucide-react';
import {ASSISTANT_TASKS,assistantRequestSchema,assistantResponseSchema,assistantStatusSchema,mockAssistantProposal,type AssistantActionId,type AssistantContext,type AssistantKind,type AssistantPagePlan,type AssistantProposal,type AssistantStatus,type AssistantTarget,type SocialSuggestion} from '@/lib/assistant/model';
import '@/styles/assistant.css';
import '@/lib/assistant/workspace.css';
import {WorkspaceAssistant} from './workspace-assistant';
import {connectionHelpProposal} from '@/lib/social/connectors/setup-assistant';
import { useAdminLanguage } from "@/components/admin/admin-language";

export type AssistantProps={
 mode:'demo'|'real';workspaceOnly?:boolean;context:AssistantContext;target?:AssistantTarget;embedded?:boolean;tone?:'sie'|'du';
 presentation?:'floating'|'inline';taskControls?:boolean;initialTask?:AssistantKind;preset?:{kind:AssistantKind;prompt?:string;signal:number};
 onApplyText?:(text:string,target:AssistantTarget)=>boolean;onCreatePost?:(post:SocialSuggestion)=>void;
 onCreatePage?:(page:AssistantPagePlan,capturedContext:AssistantContext)=>{ok:boolean;error?:string};
 onNavigate?:(id:AssistantActionId)=>void;openSignal?:number;
};
const icons={rewrite:SquarePen,page:FilePlus2,help:Waypoints,social:MessageSquareText,ideas:Lightbulb};
async function readResponse(response:Response){const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'Der Assistent ist gerade nicht erreichbar. Bitte erneut versuchen.');return result;}

export function Assistant({mode,workspaceOnly=false,context,target,embedded=false,tone='sie',presentation='floating',taskControls=true,initialTask='rewrite',preset,onApplyText,onCreatePost,onCreatePage,onNavigate,openSignal}:AssistantProps){
  const { t } = useAdminLanguage();
 const inline=presentation==='inline',demo=mode==='demo',du=tone==='du',id=useId();
 const initial=initialTask==='page'&&!onCreatePage||initialTask==='rewrite'&&!onApplyText?'help':initialTask;
 const availableTasks=ASSISTANT_TASKS.filter(action=>action.kind!=='page'||onCreatePage).filter(action=>action.kind!=='rewrite'||onApplyText);
 const [open,setOpen]=useState(false),[kind,setKind]=useState<AssistantKind>(initial),[prompt,setPrompt]=useState(ASSISTANT_TASKS.find(action=>action.kind===initial)!.prompt),[proposal,setProposal]=useState<AssistantProposal|null>(null),[status,setStatus]=useState<AssistantStatus|null>(null),[statusError,setStatusError]=useState(''),[statusAttempt,setStatusAttempt]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[localPost,setLocalPost]=useState<SocialSuggestion|null>(null),[helpTopic,setHelpTopic]=useState<NonNullable<AssistantContext['helpTopic']>>(context.helpTopic||'cms'),[guided,setGuided]=useState(false);
 const body=useRef<HTMLDivElement>(null),button=useRef<HTMLButtonElement>(null),input=useRef<HTMLTextAreaElement>(null),controller=useRef<AbortController|null>(null),pending=useRef(false),captured=useRef<AssistantTarget|undefined>(undefined),capturedContext=useRef<AssistantContext|null>(null),lastSignal=useRef(0),lastPreset=useRef<number|null>(null);
 const [workspaceView,setWorkspaceView]=useState(true);
 const guidedConnection=kind==='help'&&Boolean(context.connectionHelp);
 const workspaceAvailable=!inline&&!demo&&!guidedConnection;
 const showWorkspace=workspaceAvailable&&(workspaceOnly||workspaceView);
 const visible=inline||open,configured=guidedConnection||demo||status?.configured===true||kind==='help'&&status?.guidedHelp===true;
 const promptDrafts = useRef<Partial<Record<AssistantKind, string>>>({});
 const hasLocalPost=Boolean(localPost);
 useEffect(()=>{if(inline||!proposal&&!hasLocalPost)return;const frame=requestAnimationFrame(()=>{const container=body.current,node=container?.querySelector<HTMLElement>('.assistant-result,.assistant-local-post');if(container&&node)container.scrollTo({top:container.scrollTop+node.getBoundingClientRect().top-container.getBoundingClientRect().top-8,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});return()=>cancelAnimationFrame(frame);},[proposal,hasLocalPost,inline]);
 useEffect(()=>{if(openSignal!==undefined&&openSignal!==lastSignal.current){lastSignal.current=openSignal;setOpen(true);}},[openSignal]);
 useEffect(()=>{if(!preset||preset.signal===lastPreset.current)return;lastPreset.current=preset.signal;setWorkspaceView(false);controller.current?.abort();pending.current=false;setBusy(false);setKind(preset.kind);setPrompt(preset.prompt||ASSISTANT_TASKS.find(action=>action.kind===preset.kind)!.prompt);setProposal(null);setError('');setNotice('');if(!inline)setOpen(true);},[preset,inline]);
 useEffect(()=>{if(open&&!inline)requestAnimationFrame(()=>input.current?.focus({preventScroll:true}));},[open,inline]);
 useEffect(()=>()=>controller.current?.abort(),[]);
 useEffect(()=>{if(!visible||demo||guidedConnection||showWorkspace)return;const abort=new AbortController();setStatusError('');void fetch('/api/admin/assistant',{signal:abort.signal,cache:'no-store'}).then(readResponse).then(value=>setStatus(assistantStatusSchema.parse(value.result))).catch(reason=>{if(!abort.signal.aborted)setStatusError(reason instanceof Error?reason.message:'Der Verbindungsstatus konnte nicht geladen werden.');});return()=>abort.abort();},[visible,demo,guidedConnection,showWorkspace,statusAttempt]);
 function close(){if(inline)return;controller.current?.abort();pending.current=false;setBusy(false);setOpen(false);requestAnimationFrame(()=>button.current?.focus({preventScroll:true}));}
 useEffect(()=>{if(!open||inline)return;const keydown=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();close();}};window.addEventListener('keydown',keydown);return()=>window.removeEventListener('keydown',keydown);},[open,inline]);
 function choose(next: AssistantKind) {
  if (next === kind) return;
  promptDrafts.current[kind] = prompt;
  setKind(next);
  setPrompt(promptDrafts.current[next] ?? ASSISTANT_TASKS.find(action => action.kind === next)!.prompt);
  setProposal(null);
  setError('');
  setNotice('');
 }
 async function generate(){
  if (pending.current || !prompt.trim()) return;
  setError('');
  setNotice('');
  if(kind==='rewrite'&&(!target||!target.text.trim()||!onApplyText)){setError(du?'Wähle zuerst einen Abschnitt mit Text aus.':'Wählen Sie zuerst einen Abschnitt mit Text aus.');return;}
  const parsed=assistantRequestSchema.safeParse({kind,prompt,context:{...context,addressing:context.addressing||tone,...(kind==='rewrite'&&target?{text:target.text}:{}),...(kind==='help'?{helpTopic}:{})}});
  if(!parsed.success){setError(parsed.error.issues[0]?.message||'Bitte den Text kürzen und erneut versuchen.');return;}
  pending.current=true;setBusy(true);
  const requestTarget = target ? { ...target } : undefined;
  const abort=new AbortController();controller.current=abort;
  try{
   let next:AssistantProposal;
   let guidedResult = false;
   if(guidedConnection&&parsed.data.context.connectionHelp){next=connectionHelpProposal(parsed.data.context.connectionHelp);guidedResult = true;}
   else if(demo){await new Promise<void>((resolve,reject)=>{const timer=setTimeout(resolve,window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:650);abort.signal.addEventListener('abort',()=>{clearTimeout(timer);reject(new DOMException('Abgebrochen','AbortError'));},{once:true});});next=mockAssistantProposal(parsed.data,tone);}
   else{const response=await fetch('/api/admin/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(parsed.data),signal:abort.signal});const result=assistantResponseSchema.parse(await readResponse(response)).result;next=result.proposal;guidedResult = result.mode === 'guided';if(next.kind!==kind)throw new Error('Der Vorschlag passt nicht zur Anfrage. Bitte erneut versuchen.');}
   if (!abort.signal.aborted) {
    captured.current = requestTarget;
    capturedContext.current = parsed.data.context;
    setGuided(guidedResult);
    setProposal(next);
   }
  }catch(reason){if(!abort.signal.aborted)setError(reason instanceof Error?reason.message:'Der Vorschlag konnte nicht erstellt werden. Bitte erneut versuchen.');}
  finally{if(controller.current===abort){pending.current=false;setBusy(false);controller.current=null;}}
 }
 function apply(){
  if(proposal?.kind==='rewrite'){
   if(!captured.current||!onApplyText?.(proposal.text,captured.current)){setError(du?'Der gewählte Text wurde inzwischen verändert. Erstelle einen neuen Vorschlag.':'Der ausgewählte Text wurde inzwischen verändert. Erstellen Sie einen neuen Vorschlag.');return;}
   setNotice(du?'Im lokalen Entwurf übernommen. Du kannst die Änderung rückgängig machen.':'Im Entwurf übernommen. Die Änderung lässt sich rückgängig machen.');setProposal(null);
  }else if(proposal?.kind==='page'){
   if(!capturedContext.current||!onCreatePage){setError('Hier kann noch keine Seite angelegt werden. Bitte den Seiteneditor öffnen.');return;}
   const result=onCreatePage(proposal.page,capturedContext.current);if(!result.ok){setError(result.error||'Der Arbeitsstand hat sich verändert. Bitte einen neuen Seitenvorschlag erstellen.');return;}
   setNotice(du?'Deine neue Seite ist im lokalen Entwurf. Prüfe Inhalt und Aufbau vor dem Speichern.':'Die neue Seite ist im lokalen Entwurf. Prüfen Sie Inhalt und Aufbau vor dem Speichern.');setProposal(null);
  }else if(proposal?.kind==='social'){
   if(onCreatePost){onCreatePost(proposal.social);setNotice(du?'An das Social-Studio übergeben. Dein vorhandener Entwurf wird erst nach deiner Bestätigung gewechselt.':'An das Social-Studio übergeben. Ein bestehender Entwurf wird erst nach Ihrer Bestätigung gewechselt.');}
   else{setLocalPost({...proposal.social});setNotice(du?'Dein lokaler Post-Entwurf ist bereit zum Bearbeiten.':'Ihr lokaler Post-Entwurf ist bereit zum Bearbeiten.');}setProposal(null);
  }
 }
 async function copyIdeas(){if(proposal?.kind!=='ideas')return;try{await navigator.clipboard.writeText(proposal.ideas.map((idea,index)=>`${index+1}. ${idea}`).join('\n\n'));setNotice('Ideen in die Zwischenablage kopiert.');}catch{setError('Bitte die Ideen direkt markieren und kopieren. Die Zwischenablage ist hier nicht verfügbar.');}}
 return <div className={`assistant-host${embedded?' assistant-host--embedded':''}${inline?' assistant-host--inline':''}${demo?' assistant-host--demo':''}${visible?' assistant-host--open':''}`} data-assistant-mode={mode} data-assistant-task={kind}>
  {!inline&&<button ref={button} type="button" className="assistant-launcher" aria-expanded={open} aria-controls={id} onClick={()=>open?close():setOpen(true)}><MessageSquareText size={18}/><span>{open?t("Assistent schließen"):t("KI-Assistent")}</span>{demo&&<small>{t("Beispiel")}</small>}</button>}
  {visible&&<section id={id} className="assistant-panel" role={inline?'region':'dialog'} aria-label={t("CMS-Assistent")} onKeyDown={event=>{if(!inline&&event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}}}>
   <header className="assistant-header"><div><h2>{guidedConnection?t("Hilfe zur Kanaleinrichtung"):du?t("Dein CMS-Assistent."):t("Ihr CMS-Assistent.")}</h2><p>{showWorkspace?t("Daten und Aktionen aus dem CMS"):guidedConnection?t("Schritt für Schritt · ohne KI-Zugang nutzbar"):demo?t("Beispiel · keine echte KI-Verbindung"):guided?t("CMS-Hilfe · aktueller gespeicherter Stand"):status?.configured?(du?t("Eigener KI-Zugang hinterlegt"):t("Eigener KI-Zugang hinterlegt")):t("Optionale KI · CMS-Hilfe verfügbar")}</p></div>{!inline&&<button type="button" onClick={close} aria-label={t("Assistent minimieren")}><ChevronDown size={20}/></button>}</header>
   {workspaceAvailable&&!workspaceOnly&&<div className="assistant-mode-switch" role="group" aria-label={t("Assistentenmodus")}><button type="button" aria-pressed={showWorkspace} onClick={()=>setWorkspaceView(true)}>{t("Arbeitsbereich")}</button><button type="button" aria-pressed={!showWorkspace} onClick={()=>setWorkspaceView(false)}>{t("Editor & Hilfe")}</button></div>}
   <div className="assistant-body" ref={body}>
    {showWorkspace?<WorkspaceAssistant/>:<>
    {!demo&&!guidedConnection&&!status&&!statusError&&<p className="assistant-feedback" role="status"><LoaderCircle size={16} className="assistant-spin"/>{t("Verbindung prüfen …")}</p>}
    {!demo&&status&&!status.configured&&kind!=='help'&&<div className="assistant-setup"><strong>{t("Noch kein KI-Anbieter eingerichtet.")}</strong><p>{t("Die CMS-Hilfe ist bereits nutzbar. Für Text-, Seiten- und Social-Vorschläge wird ein eigener KI-Zugang auf dem Server benötigt.")}</p></div>}
    {statusError&&<div role="alert" className="assistant-error"><p>{t(statusError)}</p><button type="button" onClick={()=>setStatusAttempt(value=>value+1)}><RefreshCw size={15}/>{t("Status erneut laden")}</button></div>}
    {taskControls&&<><div className="assistant-actions" role="group" aria-label={t("Aufgabe")}>{availableTasks.map(action=>{const Icon=icons[action.kind];return <button key={action.kind} type="button" disabled={busy} aria-pressed={kind===action.kind} onClick={()=>choose(action.kind)}><Icon size={15}/>{t(action.label)}</button>;})}</div><label className="assistant-mobile-task">{t("Aufgabe")}<select value={kind} disabled={busy} onChange={event=>choose(event.target.value as AssistantKind)}>{availableTasks.map(action=><option key={action.kind} value={action.kind}>{t(action.label)}</option>)}</select></label></>}
    {taskControls&&!onCreatePage&&onNavigate&&<p className="assistant-scope-help">{t("Neue Seiten werden im Seiteneditor aufgebaut.") + " "}<button type="button" onClick={()=>onNavigate('pages')}>{t("Seiteneditor öffnen")}<ArrowUpRight size={14}/></button></p>}
    {kind==='help'&&!context.connectionHelp&&<div className="assistant-help-topics" role="group" aria-label={t("Hilfethema")}>{([{id:'cms',label:'Bedienung'},{id:'inquiries',label:'Anfragen'},{id:'shop',label:'Shop'},{id:'social',label:'Kanäle'}] as const).map(topic=><button key={topic.id} type="button" disabled={busy} aria-pressed={helpTopic===topic.id} onClick={()=>{setHelpTopic(topic.id);setProposal(null);setError('');}}>{t(topic.label)}</button>)}</div>}
    <div className="assistant-context"><span>{guidedConnection?t("Ihr Kanal"):kind==='page'?t("Grundlage für die neue Seite"):t("Ausgewählt")}</span><strong>{context.heading||context.pageTitle||context.brandName}</strong></div>
    <form onSubmit={event=>{event.preventDefault();void generate();}}><label htmlFor={`${id}-prompt`}>{kind==='page'?(du?t("Welche Seite möchtest du ergänzen?"):t("Welche Seite möchten Sie ergänzen?")):kind==='help'?(du?t("Was möchtest du wissen?"):t("Was möchten Sie wissen?")):du?t("Was möchtest du vorbereiten?"):t("Was möchten Sie vorbereiten?")}</label><textarea ref={input} id={`${id}-prompt`} aria-keyshortcuts="Control+Enter Meta+Enter" onKeyDown={event => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.nativeEvent.isComposing && configured && !busy) {
        event.preventDefault();
        event.currentTarget.form?.requestSubmit();
      }
    }} value={prompt} maxLength={1500} rows={3} disabled={busy} onChange={event=>setPrompt(event.target.value)}/><div className="assistant-form-end"><span>{prompt.length}/1500</span>{busy?<button type="button" onClick={event => {event.preventDefault();controller.current?.abort();pending.current=false;setBusy(false);requestAnimationFrame(() => input.current?.focus({preventScroll:true}));}}>{t("Abbrechen")}</button>:<button type="submit" disabled={!prompt.trim()||!configured}><Send size={15}/>{demo?t("Beispiel erstellen"):kind==='help'?t("Hilfe anzeigen"):t("Vorschlag erstellen")}</button>}</div></form>
    {busy&&<div className="assistant-thinking" role="status"><i/><i/><i/><span>{demo?t("Beispielvorschlag wird vorbereitet …"):kind==='help'?t("CMS-Hilfe wird vorbereitet …"):t("Vorschlag wird erstellt …")}</span></div>}
    {error&&<div className="assistant-error" role="alert"><p>{t(error)}</p><button type="button" onClick={()=>void generate()} disabled={busy||!configured}><RefreshCw size={15}/>{t("Erneut versuchen")}</button></div>}
    {proposal&&<article className="assistant-result" inert={busy} aria-busy={busy}><h3>{proposal.title}</h3><p>{proposal.summary}</p>
     {proposal.kind==='rewrite'&&<div className="assistant-comparison"><details><summary>{t("Bisheriger Text")}</summary><p>{captured.current?.text}</p></details><div><strong>{t("Vorschlag")}</strong><p>{proposal.text}</p></div></div>}
     {proposal.kind==='page'&&<div className="assistant-page-plan"><label>{t("Seitentitel")}<input value={proposal.page.title} maxLength={100} onChange={event=>setProposal({...proposal,page:{...proposal.page,title:event.target.value}})}/></label><label>{t("Seitenadresse")}<span className="assistant-slug"><span>/</span><input value={proposal.page.slug} maxLength={150} autoCapitalize="none" autoCorrect="off" spellCheck={false} onChange={event=>setProposal({...proposal,page:{...proposal.page,slug:event.target.value}})}/></span></label><label>{t("Kurzbeschreibung")}<textarea rows={2} value={proposal.page.description} maxLength={320} onChange={event=>setProposal({...proposal,page:{...proposal.page,description:event.target.value}})}/></label><ol>{proposal.page.sections.map((section,index)=><li key={index}><span>{String(index+1).padStart(2,'0')} / {section.type}</span><h4>{section.heading}</h4><p>{section.text}</p>{section.items?.length?<ul>{section.items.map((item,n)=><li key={n}><strong>{item.title}</strong><p>{item.text}</p></li>)}</ul>:null}</li>)}</ol><p className="assistant-plan-note">{t("Die Seite wird als Entwurf angelegt. Anschließend lassen sich Abschnitte, Texte und eigene Bilder im CMS bearbeiten.")}</p></div>}
     {proposal.kind==='social'&&<><div className="assistant-post"><span>{context.brandName}</span><h4>{proposal.social.headline}</h4><p>{proposal.social.body}</p><ArrowRight size={24}/></div><div className="assistant-caption"><strong>Caption</strong><p>{proposal.social.caption}</p></div></>}
     {proposal.kind==='ideas'&&<ul>{proposal.ideas.map(idea=><li key={idea}>{idea}</li>)}</ul>}
     {proposal.kind==='help'&&<div className="assistant-help-result"><p>{proposal.answer}</p>{proposal.actions.length>0&&<div>{proposal.actions.map(action=><button key={action.id} type="button" onClick={()=>{if(onNavigate)onNavigate(action.id);else setNotice(demo?'In diesem Beispiel bleibt alles lokal. Im eigenen CMS führt diese Aktion in den passenden Bereich.':'Diesen Bereich über die Hauptnavigation öffnen.');}}>{action.label}<ArrowUpRight size={16}/></button>)}</div>}</div>}
     <div className="assistant-result-actions">{['rewrite','social'].includes(proposal.kind)&&<button type="button" className="assistant-apply" onClick={apply}><Check size={15}/>{t("In Entwurf übernehmen")}</button>}{proposal.kind==='page'&&<button type="button" className="assistant-apply" onClick={apply} disabled={!onCreatePage}><FilePlus2 size={15}/>{t("Seite als Entwurf anlegen")}</button>}{proposal.kind==='ideas'&&<button type="button" onClick={()=>void copyIdeas()}><Copy size={15}/>{t("Ideen kopieren")}</button>}<button type="button" onClick={()=>setProposal(null)}><X size={15}/>{proposal.kind==='help'?t("Schließen"):t("Verwerfen")}</button></div>
    </article>}
    {notice&&<p className="assistant-feedback" role="status"><Check size={16}/>{t(notice)}</p>}
    {localPost&&<div className="assistant-local-post"><h3>{t("Lokaler Post-Entwurf")}</h3><div className="assistant-post"><label>{t("Bildtext")}<input value={localPost.headline} maxLength={180} onChange={event=>setLocalPost({...localPost,headline:event.target.value})}/></label><label>{t("Kurztext")}<textarea rows={3} value={localPost.body} maxLength={1200} onChange={event=>setLocalPost({...localPost,body:event.target.value})}/></label></div><label>Caption<textarea rows={4} value={localPost.caption} maxLength={2200} onChange={event=>setLocalPost({...localPost,caption:event.target.value})}/></label><button type="button" onClick={()=>{const blob=new Blob([JSON.stringify(localPost,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='beispiel-social-post.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>{t("Entwurf herunterladen")}</button><button type="button" onClick={()=>setLocalPost(null)}>{t("Post verwerfen")}</button></div>}
    {guidedConnection?<p className="assistant-footnote">{t("Der Assistent erklärt die Schritte. Anmeldung und Zugriff bestätigen Sie direkt beim Anbieter.")}</p>:<p className="assistant-footnote">{demo?t("Vorbereitetes Beispiel ohne KI-Verbindung."):guided?t("Die CMS-Hilfe führt keine Änderungen aus."):t("Bitte Angaben und Ton prüfen.")} {du?t("Du entscheidest, was du übernimmst."):t("Sie entscheiden, was Sie übernehmen.")}{" " + t("Es wird nichts automatisch gespeichert oder veröffentlicht.")}</p>}
    </>}
   </div>
  </section>}
 </div>;
}