"use client";

import {useEffect,useRef,type CSSProperties} from 'react';
import {ArrowRight,ArrowUpRight} from 'lucide-react';
import type {CreatorSectionProps} from '@/lib/creator/types';
import {ContentLink,EditableText} from '@/components/site/editable';
import {useSectionHeadingLevel} from '@/components/site/heading-level';
import {advanceMotionProgress} from '@/lib/motion-progress';
import {updateCreatorItem} from '../marketing/creator-copy';
import {CreatorPhoto} from '../marketing/creator-photo';
import styles from './story.module.css';

export function CreatorScrollStory({section,editable=false,onChange}:CreatorSectionProps){
  const root=useRef<HTMLDivElement>(null),items=section.content.items??[];
  const heading=useSectionHeadingLevel(section.id);
  useEffect(()=>{
    const node=root.current;if(!node||editable||items.length<2)return;
    const preference=matchMedia('(prefers-reduced-motion: reduce)');
    let near=false,frame=0,progress:number|undefined,lastTime=0;
    const panels=[...node.querySelectorAll<HTMLElement>('[data-story-panel]')];
    const scene=node.firstElementChild as HTMLElement | null;
    const stop=()=>{
      cancelAnimationFrame(frame);frame=0;lastTime=0;progress=undefined;
      panels.forEach(panel=>{panel.dataset.storyActive='false';panel.inert=false;});
    };
    const paint=(time:number)=>{
      frame=0;if(!near||document.hidden||preference.matches)return;
      const rect=node.getBoundingClientRect(),travel=Math.max(1,rect.height-(scene?.offsetHeight??innerHeight));
      const target=Math.max(0,Math.min(1,-rect.top/travel));
      const visible=rect.top<innerHeight&&rect.bottom>0;
      const dt=lastTime?(time-lastTime)/1000:1/60;lastTime=time;
      progress=progress===undefined||!visible?target:advanceMotionProgress(progress,target,dt,1.45);
      const current=progress*(items.length-1),active=Math.min(items.length-1,Math.round(current));
      panels.forEach((panel,index)=>{
        const leave=Math.max(0,Math.min(1,current-index));
        panel.style.setProperty('--leave',String(leave));
        panel.dataset.storyActive=String(visible&&index===active);
        panel.inert=visible&&index!==active&&!panel.contains(document.activeElement);
      });
      if(progress!==target)request();else lastTime=0;
    };
    const request=()=>{if(near&&!frame&&!document.hidden&&!preference.matches)frame=requestAnimationFrame(paint);};
    const activity=()=>{if(document.hidden||preference.matches)stop();else request();};
    const observer=new IntersectionObserver(entries=>{near=entries[0]?.isIntersecting??false;if(near)request();else stop();},{rootMargin:'50% 0px'});
    observer.observe(node);window.addEventListener('scroll',request,{passive:true});window.addEventListener('resize',request,{passive:true});document.addEventListener('visibilitychange',activity);preference.addEventListener('change',activity);
    return()=>{observer.disconnect();stop();window.removeEventListener('scroll',request);window.removeEventListener('resize',request);document.removeEventListener('visibilitychange',activity);preference.removeEventListener('change',activity);};
  },[editable,items.length]);
  return <div ref={root} className={styles.story} data-story="" data-editable={editable?'true':undefined} aria-label={section.content.heading} style={{'--story-travel':`${Math.max(0,items.length-1)*72}svh`} as CSSProperties}>
    <div className={styles.scene}>
      {items.map((item,index)=><article key={item.id} className={styles.panel} data-story-panel="" data-item-id={item.id} style={{'--panel-order':items.length-index,'--leave':0} as CSSProperties}>
        <CreatorPhoto image={item.image} editable={editable} onChange={image=>onChange?.(updateCreatorItem(section,index,{image}))} className={styles.photo}/>
        <div className={styles.copy}>
          <EditableText as={heading} value={item.title} editable={editable} onChange={title=>onChange?.(updateCreatorItem(section,index,{title}))}/>
          <EditableText as="p" value={item.text} editable={editable} onChange={text=>onChange?.(updateCreatorItem(section,index,{text}))}/>
          {Boolean(item.details?.length)&&<ol className={styles.flow} aria-label="Beispielablauf">{item.details?.map((step,n)=><li key={n}><EditableText as="span" value={step} editable={editable} onChange={value=>onChange?.(updateCreatorItem(section,index,{details:item.details?.map((text,j)=>j===n?value:text)}))}/>{n<item.details!.length-1&&<ArrowRight size={15} aria-hidden="true"/>}</li>)}</ol>}
          {item.label&&<ContentLink href={item.href} editField="href" editItemId={item.id} editable={editable} className={styles.action}><EditableText as="span" value={item.label} editable={editable} onChange={label=>onChange?.(updateCreatorItem(section,index,{label}))}/><ArrowUpRight size={21}/></ContentLink>}
        </div>
      </article>)}
    </div>
  </div>;
}
