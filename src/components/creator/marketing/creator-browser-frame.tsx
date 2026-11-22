"use client";

import {useEffect,useRef,useState,type ReactNode} from 'react';
import {ArrowUpRight,Maximize2,Minimize2} from 'lucide-react';
import styles from './neutral-marketing.module.css';
import layerStyles from './browser-layer.module.css';


export function CreatorBrowserFrame({title,caption,expandLabel,collapseLabel,externalHref,externalLabel,children,className='',editable=false,context='website'}:{
  title:string;caption?:string;expandLabel:string;collapseLabel:string;
  externalHref?:string;externalLabel?:string;children:ReactNode;className?:string;editable?:boolean;context?:'website'|'editor';
}){
  const [full,setFull]=useState(false);
  const [anchorHeight,setAnchorHeight]=useState<number>();
  const root=useRef<HTMLDivElement>(null);
  const toggle=useRef<HTMLButtonElement>(null);
  const lastFocus=useRef<HTMLElement|null>(null);
  const outerScroll=useRef({x:0,y:0});
  const layer=useRef<'native'|'popover'|'css'|null>(null);
  async function close(){
    const node=root.current;
    if(node&&document.fullscreenElement===node)await document.exitFullscreen().catch(()=>{});
    if(node&&layer.current==='popover'){try{node.hidePopover();}catch{}node.removeAttribute('popover');}
    layer.current=null;setFull(false);
  }
  async function open(){
    const node=root.current;if(!node)return;
    lastFocus.current=document.activeElement as HTMLElement;
    outerScroll.current={x:window.scrollX,y:window.scrollY};
    setAnchorHeight(node.getBoundingClientRect().height);
    // The manual top layer fills the viewport and lets child menus consume Escape.
    // Native fullscreen reserves physical Escape before page handlers can run.
    if(node.showPopover){try{node.setAttribute('popover','manual');node.showPopover();layer.current='popover';setFull(true);return;}catch{node.removeAttribute('popover');}}
    try{if(node.requestFullscreen){await node.requestFullscreen();if(document.fullscreenElement===node){layer.current='native';setFull(true);return;}}}catch{}
    if(!layer.current)layer.current='css';setFull(true);
  }
  useEffect(()=>{
    const changed=()=>{if(layer.current==='native'&&document.fullscreenElement!==root.current){layer.current=null;setFull(false);}};
    document.addEventListener('fullscreenchange',changed);
    return()=>document.removeEventListener('fullscreenchange',changed);
  },[]);
  useEffect(()=>{
    if(!full)return;
    const originalOverflow=document.body.style.overflow;
    const scroll=outerScroll.current;
    document.body.style.overflow='hidden';toggle.current?.focus({preventScroll:true});
    function keys(event:KeyboardEvent){
      if(event.defaultPrevented)return;
      if(event.key==='Escape'){
        const childPopover=root.current?.querySelector<HTMLElement>('[popover]:popover-open');
        if(childPopover){event.preventDefault();event.stopPropagation();childPopover.hidePopover();root.current?.querySelector<HTMLElement>(`[popovertarget="${childPopover.id}"]`)?.focus({preventScroll:true});return;}
        event.preventDefault();event.stopPropagation();void close();return;
      }
      if(event.key!=='Tab')return;
      const controls=root.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),iframe,[tabindex="0"]');
      const visible=Array.from(controls??[]).filter(node=>node.offsetParent!==null&&!node.closest('[inert]'));
      const first=visible[0],last=visible.at(-1);
      if(event.shiftKey&&document.activeElement===first){
        event.preventDefault();
        if(last instanceof HTMLIFrameElement){try{const inner=Array.from(last.contentDocument?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex="0"]')??[]).filter(node=>node.offsetParent!==null);inner.at(-1)?.focus();}catch{last.focus();}}
        else last?.focus();
      }else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
    document.addEventListener('keydown',keys);
    return()=>{
      document.body.style.overflow=originalOverflow;document.removeEventListener('keydown',keys);
      const behavior=document.documentElement.style.scrollBehavior;document.documentElement.style.scrollBehavior='auto';window.scrollTo(scroll.x,scroll.y);document.documentElement.style.scrollBehavior=behavior;
      if(lastFocus.current?.isConnected)lastFocus.current.focus({preventScroll:true});
    };
  },[full]);
  return <div className={layerStyles.anchor} style={full?{height:anchorHeight}:undefined}>
  <div ref={root} className={`${styles.frame} ${layerStyles.viewport} ${full?styles.fullFrame:''} ${className}`} role={full?'dialog':'group'} aria-modal={full||undefined} aria-label={title} data-demo-context={context} data-demo-window={editable?'off':'on'} data-scroll-mode="demo" data-fullscreen={full?'true':undefined} style={full?{border:0,margin:0}:undefined}>
    <div className={styles.frameActions} data-creator-frame-actions="">
      <p>{caption}</p>
      <div className={layerStyles.boundary}>
        <div>{externalHref&&<a href={externalHref} target="_blank" rel="noopener noreferrer">{externalLabel}<ArrowUpRight size={16}/></a>}
        <button type="button" ref={toggle} aria-label={full?collapseLabel:expandLabel} aria-expanded={full} aria-haspopup="dialog" onClick={()=>void(full?close():open())}>{full?<Minimize2 size={16}/>:<Maximize2 size={16}/>}<span>{full?collapseLabel:expandLabel}</span></button></div>
      </div>
    </div>
    <div className={styles.browser} data-creator-browser="">
      <div className={styles.browserChrome}><span className={styles.traffic} aria-hidden="true"><i/><i/><i/></span><span className={styles.browserTitle}>{title}</span><span className={styles.browserSecure} aria-hidden="true"><span/></span></div>
      <div className={styles.browserBody} data-creator-browser-body=""><div className={layerStyles.surface} data-creator-browser-surface="">{children}</div></div>
    </div>
  </div></div>;
}
