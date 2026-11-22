"use client";

import dynamic from 'next/dynamic';
import {useCallback,useContext,useEffect,useId,useRef,useState} from 'react';
import {Monitor,Smartphone} from 'lucide-react';
import fixture from '@/data/creator-demo.json';
import type {WebsiteContent} from '@/lib/types';
import type {CreatorSectionProps} from '@/lib/creator/types';
import {demoStorageKey} from '@/lib/creator/demo-state';
import {demoBrowserPath,isDemoFrameMessage} from '@/lib/creator/demo-browser';
import {siteNavigationEvent} from '@/lib/navigation';
import {ContentLink,EditableText,SiteInteractionContext} from '@/components/site/editable';
import {useSectionHeadingLevel} from '@/components/site/heading-level';
import {CreatorBrowserFrame} from '../marketing/creator-browser-frame';
import {creatorCopy} from '../marketing/creator-copy';
import styles from './experience.module.css';

const initialContent=fixture as WebsiteContent;
function EditorLoading(){return <div className={styles.editorLoading} role="status">Dein CMS-Beispiel wird geöffnet …</div>;}
const DemoCms=dynamic(()=>import('./demo-cms').then(module=>module.DemoCms),{ssr:false,loading:EditorLoading});
const focusable='a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]';

export function CreatorDemoExperience(props:CreatorSectionProps){
  const {isolated}=useContext(SiteInteractionContext);
  const heading=useSectionHeadingLevel(props.section.id);
  // A visitor can add this section to a local draft. Never recursively frame it.
  if(isolated)return <div className={styles.inlineFallback}><EditableText as={heading} value={props.section.content.heading} editable={props.editable} onChange={value=>props.onChange?.({...props.section,content:{...props.section.content,heading:value}})}/><EditableText value={props.section.content.text} editable={props.editable} onChange={value=>props.onChange?.({...props.section,content:{...props.section.content,text:value}})}/><ContentLink href={initialContent.config.modules?.creator?.demoBasePath} editable={props.editable}>{initialContent.config.name}</ContentLink></div>;
  return <Experience {...props}/>;
}

function Experience({section,editable,onChange}:CreatorSectionProps){
  const c=section.content,ui=creatorCopy(section);
  const base=initialContent.config.modules!.creator!.demoBasePath;
  const key=demoStorageKey(initialContent);
  const id=useId();
  const heading=useSectionHeadingLevel(section.id);
  const iframe=useRef<HTMLIFrameElement>(null);
  const host=useRef<HTMLDivElement>(null);
  const cleanupDocument=useRef<()=>void>(()=>{});
  const [mode,setMode]=useState<'website'|'cms'>(()=>editable?'website':'cms');
  const [editorMounted,setEditorMounted]=useState(false);
  const [editorReady,setEditorReady]=useState(false);
  const markEditorReady=useCallback(()=>setEditorReady(true),[]);
  const [device,setDevice]=useState<'desktop'|'mobile'>('desktop');
  const [route,setRoute]=useState(base);
  const [loaded,setLoaded]=useState(false);
  const entry=c.primaryHref&&(c.primaryHref===base||[base+'/',base+'?',base+'#'].some(prefix=>c.primaryHref!.startsWith(prefix)))?c.primaryHref:base;
  const text=(field:'heading'|'text',value:string)=>onChange?.({...section,content:{...c,[field]:value}});
  function selectMode(next:'website'|'cms'){
    if(editable)return;
    if(next==='cms'){
      setEditorMounted(true);
      try{iframe.current?.contentDocument?.querySelectorAll<HTMLMediaElement>('video,audio').forEach(media=>media.pause());}catch{}
    }
    setMode(next);
  }
  useEffect(()=>{
    if(editable||editorMounted)return;
    const node=host.current;if(!node)return;
    const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setEditorMounted(true);observer.disconnect();}},{rootMargin:'160px 0px'});
    observer.observe(node);return()=>observer.disconnect();
  },[editable,editorMounted]);
  useEffect(()=>{
    const query=()=>{if(new URLSearchParams(location.search).get('demo')==='cms')selectMode('cms');};
    const navigate=(event:Event)=>{const href=(event as CustomEvent<{href:string}>).detail?.href;if(!href)return;const url=new URL(href,location.href);if(url.pathname===location.pathname&&url.searchParams.get('demo')==='cms')selectMode('cms');};
    query();window.addEventListener('popstate',query);window.addEventListener(siteNavigationEvent,navigate);
    return()=>{window.removeEventListener('popstate',query);window.removeEventListener(siteNavigationEvent,navigate);};
  },[editable]);
  useEffect(()=>{
    const publish=(event:Event)=>{
      const detail=(event as CustomEvent<{key?:string;published?:WebsiteContent}>).detail;
      if(detail?.key===key&&detail.published)iframe.current?.contentWindow?.postMessage({type:'ws:demo-published',key,published:detail.published},location.origin);
    };
    const message=(event:MessageEvent)=>{
      if(!isDemoFrameMessage(event,iframe.current?.contentWindow||null,location.origin,key))return;
      if(event.data.type==='ws:demo-location'&&typeof event.data.path==='string'){
        const next=demoBrowserPath(event.data.path,base,location.origin);if(next)setRoute(next);
      }
    };
    window.addEventListener('ws:demo-published',publish);window.addEventListener('message',message);
    return()=>{window.removeEventListener('ws:demo-published',publish);window.removeEventListener('message',message);cleanupDocument.current();};
  },[base,key]);
  function loadedDocument(){
    cleanupDocument.current();
    const frame=iframe.current;if(!frame)return;
    try{
      const doc=frame.contentDocument,view=frame.contentWindow;if(!doc||!view)return;
      const current=demoBrowserPath(view.location.href,base,location.origin);
      if(!current){view.location.replace(base);return;}
      setRoute(current);setLoaded(true);
      const click=(event:MouseEvent)=>{
        const anchor=(event.target as Element).closest<HTMLAnchorElement>('a[href]');if(!anchor)return;
        const url=new URL(anchor.href,view.location.href);
        if(url.origin===location.origin&&url.pathname===base+'/cms'){event.preventDefault();event.stopImmediatePropagation();selectMode('cms');return;}
        if(anchor.download||url.pathname.startsWith('/assets/')||url.pathname.startsWith('/downloads/'))return;
        if(!demoBrowserPath(url.href,base,location.origin)){
          event.preventDefault();event.stopImmediatePropagation();
          if(url.origin===location.origin&&/^\/(?:websites|tools|kontakt|impressum|datenschutz)?$/.test(url.pathname))window.location.assign(url.href);
        }
      };
      const keys=(event:KeyboardEvent)=>{
        const modal=frame.closest<HTMLElement>('[data-fullscreen="true"]');if(!modal||event.defaultPrevented)return;
        if(event.key==='Escape'){setTimeout(()=>{if(!event.defaultPrevented&&frame.closest('[data-fullscreen="true"]'))document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));},0);}
        if(event.key==='Tab'&&!event.shiftKey){
          const controls=Array.from(doc.querySelectorAll<HTMLElement>(focusable)).filter(node=>node.offsetParent!==null&&!node.closest('[inert]'));
          if(doc.activeElement===controls.at(-1)){event.preventDefault();modal.querySelector<HTMLElement>(focusable)?.focus();}
        }
      };
      doc.addEventListener('click',click,true);doc.addEventListener('keydown',keys);
      cleanupDocument.current=()=>{doc.removeEventListener('click',click,true);doc.removeEventListener('keydown',keys);};
    }catch{setLoaded(false);}
  }
  return <div ref={host} className={`${styles.experienceSection} ${c.heading?styles.withIntro:''}`}>
    {(c.heading||c.text)&&<div className={styles.intro}><EditableText as={heading} value={c.heading} editable={editable} onChange={value=>text('heading',value)}/><EditableText value={c.text} editable={editable} onChange={value=>text('text',value)}/></div>}
    <CreatorBrowserFrame context={mode==='cms'?'editor':'website'} editable={editable} title={c.caption||initialContent.config.name} caption={ui('browserCaption')} expandLabel={ui('expand')||'Vollbild öffnen'} collapseLabel={ui('collapse')||'Vollbild schließen'} externalHref={route} externalLabel={ui('openSeparate')||'Separat öffnen'} className={`${styles.experience} ${section.design.spacing==='compact'?styles.compact:''}`}>
      <div className={styles.modebar}>
        <div className={styles.modes} role="tablist" aria-label={ui('modeLabel')||'Website oder CMS'}>
          <button type="button" id={`${id}-website-tab`} role="tab" aria-selected={mode==='website'} aria-controls={`${id}-website`} disabled={editable} onClick={()=>selectMode('website')}>{c.primaryLabel||'Website'}</button>
          <button type="button" id={`${id}-cms-tab`} role="tab" aria-selected={mode==='cms'} aria-controls={`${id}-cms`} disabled={editable} onClick={()=>selectMode('cms')}>{c.secondaryLabel||'CMS'}</button>
        </div>
        <span className={styles.address}>{route}</span>
        {mode==='website'&&<div className={styles.devices} role="group" aria-label={ui('deviceLabel')||'Ansicht'}><button type="button" aria-label="Desktop" aria-pressed={device==='desktop'} onClick={()=>setDevice('desktop')}><Monitor size={17}/></button><button type="button" aria-label="Smartphone" aria-pressed={device==='mobile'} onClick={()=>setDevice('mobile')}><Smartphone size={17}/></button></div>}
      </div>
      <div className={styles.panels}>
        <div id={`${id}-website`} role="tabpanel" aria-labelledby={`${id}-website-tab`} hidden={mode!=='website'} className={`${styles.pane} ${styles.websitePane}`} aria-busy={!loaded}>
          <iframe ref={iframe} src={entry} title={ui('websiteTitle')||`${initialContent.config.name} – navigierbares fiktives Beispiel`} className={`${styles.website} ${device==='mobile'?styles.mobile:''}`} loading="lazy" allow="fullscreen" allowFullScreen sandbox="allow-same-origin allow-scripts allow-forms allow-downloads" referrerPolicy="same-origin" onLoad={loadedDocument} tabIndex={editable?-1:0} style={editable?{pointerEvents:'none'}:undefined}/>
        </div>
        <div id={`${id}-cms`} role="tabpanel" aria-labelledby={`${id}-cms-tab`} hidden={mode!=='cms'} className={`${styles.pane} ${styles.cmsPane}`} aria-busy={!editorReady}>
          {editorMounted?<DemoCms initialContent={initialContent} embedded storageKey={key} onReady={markEditorReady} onShowWebsite={()=>selectMode('website')}/>:<EditorLoading/>}
        </div>
      </div>
    </CreatorBrowserFrame>
  </div>;
}
