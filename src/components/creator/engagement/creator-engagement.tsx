"use client";

import {useLayoutEffect,useRef,useState,type CSSProperties} from 'react';
import {ArrowUpRight,Heart,MousePointer2} from 'lucide-react';
import type {CreatorSectionProps} from '@/lib/creator/types';
import type {ImageValue,SectionContent} from '@/lib/types';
import {engagementPhotoValue} from '@/lib/creator/engagement';
import {advanceMotionProgress} from '@/lib/motion-progress';
import {ContentLink,EditableText} from '@/components/site/editable';
import {useSectionHeadingLevel} from '@/components/site/heading-level';
import {CreatorPhoto} from '../marketing/creator-photo';
import styles from './engagement.module.css';

type Point=readonly[number,number];
type Device='desktop'|'mobile';
const scenes={
  desktop:{width:1672,height:941,screenWidth:720,screenHeight:430,corners:[[675,161],[1386,167],[1378,591],[659,570]] as const},
  mobile:{width:941,height:1672,screenWidth:352,screenHeight:735,corners:[[359,300],[711,300],[711,1035],[359,1035]] as const},
};

/** Project the live HTML onto the photographed display, including its small perspective. */
function screenProjection(width:number,height:number,corners:readonly Point[]) {
  const points:Point[]=[[0,0],[width,0],[width,height],[0,height]];
  const rows:number[][]=[];
  points.forEach(([x,y],index)=>{
    const [u,v]=corners[index];
    rows.push([x,y,1,0,0,0,-u*x,-u*y,u],[0,0,0,x,y,1,-v*x,-v*y,v]);
  });
  for(let column=0;column<8;column++){
    let pivot=column;
    for(let row=column+1;row<8;row++)if(Math.abs(rows[row][column])>Math.abs(rows[pivot][column]))pivot=row;
    [rows[column],rows[pivot]]=[rows[pivot],rows[column]];
    const divisor=rows[column][column];
    for(let cell=column;cell<9;cell++)rows[column][cell]/=divisor;
    for(let row=0;row<8;row++)if(row!==column){
      const factor=rows[row][column];
      for(let cell=column;cell<9;cell++)rows[row][cell]-=factor*rows[column][cell];
    }
  }
  const [a,b,c,d,e,f,g,h]=rows.map(row=>row[8]);
  return `matrix3d(${[a,d,0,g,b,e,0,h,0,0,1,0,c,f,0,1].join(',')})`;
}
const screenTransforms={desktop:screenProjection(720,430,scenes.desktop.corners),mobile:screenProjection(352,735,scenes.mobile.corners)};
const clamp=(value:number)=>Math.max(0,Math.min(1,value));

export function CreatorEngagement({section,editable=false,onChange}:CreatorSectionProps){
  const root=useRef<HTMLDivElement>(null),stage=useRef<HTMLDivElement>(null);
  const [liked,setLiked]=useState(false),[pulse,setPulse]=useState(0);
  const autoPlayed=useRef(false),userChose=useRef(false);
  const c=section.content,heading=useSectionHeadingLevel(section.id);
  const hasPhotos=Boolean(c.images?.[0]?.src&&c.images?.[1]?.src);
  const update=<K extends keyof SectionContent>(key:K,value:SectionContent[K])=>onChange?.({...section,content:{...c,[key]:value}});
  const changeImage=(index:number,image:ImageValue)=>{
    const images=[...(c.images??[])];images[index]=engagementPhotoValue(c.images?.[index],image);update('images',images);
  };

  useLayoutEffect(()=>{
    const node=root.current,viewport=stage.current;if(!node||!viewport)return;
    const preference=matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0,near=false,current=0,target=0,lastTime=0,device:Device='desktop';
    let fit=1,startZoom=1,startX=0,startY=0,endX=0,endY=0;
    const activePlane=()=>viewport.querySelector<HTMLElement>(`[data-device="${device}"]`);
    const stop=()=>{cancelAnimationFrame(frame);frame=0;lastTime=0;};
    const paint=()=>{
      const plane=activePlane();if(!plane)return;
      const progress=editable||preference.matches||!hasPhotos?1:clamp(current);
      // A smooth pullback with a short readable pause at either end.
      const t=clamp((progress-.06)/.86),eased=t*t*(3-2*t);
      const zoom=startZoom+(1-startZoom)*eased;
      plane.style.setProperty('--engagement-zoom',String(zoom));
      plane.style.setProperty('--engagement-x',`${startX*(1-eased)+endX*eased}px`);
      plane.style.setProperty('--engagement-y',`${startY*(1-eased)+endY*eased}px`);
      node.style.setProperty('--engagement-outro',String(clamp((progress-.58)/.32)));
      node.dataset.outro=progress>=.6?'true':'false';
      node.dataset.progress=progress.toFixed(3);
      if(!editable&&near&&!preference.matches&&progress>=.48&&!autoPlayed.current){
        autoPlayed.current=true;
        if(!userChose.current){setLiked(true);setPulse(value=>value+1);}
      }
    };
    const measure=()=>{
      const width=viewport.clientWidth,height=viewport.clientHeight;
      device=width<=700||(width<=1000&&height>=width)?'mobile':'desktop';
      const scene=scenes[device],plane=activePlane();if(!plane)return;
      const screenCenterX=scene.corners.reduce((sum,point)=>sum+point[0],0)/4;
      const screenCenterY=scene.corners.reduce((sum,point)=>sum+point[1],0)/4;
      const cover=Math.max(width/scene.width,height/scene.height);
      fit=device==='mobile'?Math.max(cover,Math.min(width/(scene.screenWidth*1.45),height/(scene.screenHeight*1.1))):cover;
      startZoom=Math.max(width/(scene.screenWidth*fit),height/(scene.screenHeight*fit))*1.035;
      startX=(scene.width/2-screenCenterX)*fit*startZoom;
      startY=(scene.height/2-screenCenterY)*fit*startZoom;
      endX=device==='mobile'?(scene.width/2-screenCenterX)*fit*.75:0;
      endY=device==='mobile'?(scene.height/2-screenCenterY)*fit*.9:0;
      plane.style.setProperty('--engagement-photo-width',`${scene.width*fit}px`);
      plane.style.setProperty('--engagement-photo-height',`${scene.height*fit}px`);
      plane.style.setProperty('--engagement-fit',String(fit));
      const rect=node.getBoundingClientRect();
      target=clamp(-rect.top/Math.max(1,rect.height-height));
      if(!near||node.dataset.ready!=='true')current=target;
      paint();node.dataset.ready='true';
    };
    const tick=(time:number)=>{
      frame=0;
      if(!near||document.hidden||preference.matches||editable)return;
      const delta=lastTime?Math.min(64,time-lastTime):16;lastTime=time;
      current=advanceMotionProgress(current,target,delta/1000,1.65,10);
      paint();
      if(current!==target)frame=requestAnimationFrame(tick);else lastTime=0;
    };
    const request=()=>{
      if(editable||preference.matches||!hasPhotos)return;
      const rect=node.getBoundingClientRect();
      target=clamp(-rect.top/Math.max(1,rect.height-viewport.clientHeight));
      if(near&&!document.hidden&&!frame)frame=requestAnimationFrame(tick);
    };
    const visibility=()=>{if(document.hidden)stop();else request();};
    const motion=()=>{stop();measure();request();};
    const observer=new IntersectionObserver(entries=>{
      near=entries[0]?.isIntersecting??false;
      if(near){measure();request();}else stop();
    },{rootMargin:'40% 0px'});
    const resize=new ResizeObserver(measure);
    measure();observer.observe(node);resize.observe(viewport);
    window.addEventListener('scroll',request,{passive:true});
    document.addEventListener('visibilitychange',visibility);
    preference.addEventListener('change',motion);
    return()=>{stop();observer.disconnect();resize.disconnect();window.removeEventListener('scroll',request);document.removeEventListener('visibilitychange',visibility);preference.removeEventListener('change',motion);};
  },[editable,hasPhotos]);

  const toggle=()=>{userChose.current=true;setLiked(value=>!value);setPulse(value=>value+1);};
  return <div ref={root} className={styles.engagement} data-engagement="" data-editable={editable?'true':undefined} data-missing={!hasPhotos?'true':undefined}>
    <div ref={stage} className={styles.scene}>
      {(['desktop','mobile'] as const).map((device,index)=>{
        const scene=scenes[device];
        return <div key={device} className={`${styles.plane} ${styles[device]}`} data-device={device} style={{'--engagement-source-width':`${scene.width}px`,'--engagement-source-height':`${scene.height}px`} as CSSProperties}>
          <div className={styles.world}>
            <CreatorPhoto image={c.images?.[index]} editable={editable} onChange={image=>changeImage(index,image)} sizes={device==='mobile'?'(max-width:1000px) 170vw, 1px':'(min-width:701px) 160vw, 1px'} className={styles.photo}/>
            <div className={styles.screen} style={{width:scene.screenWidth,height:scene.screenHeight,transform:screenTransforms[device]}}>
              {device==='mobile'&&<span className={styles.island} aria-hidden="true"/>}
              <div className={styles.screenHeader}>
                <EditableText as="span" value={c.subheading} editable={editable} onChange={value=>update('subheading',value)}/>
                <span className={styles.statusDot} aria-hidden="true"/>
              </div>
              <div className={styles.screenBody}>
                <EditableText as={heading} value={c.heading} editable={editable} onChange={value=>update('heading',value)} className={styles.heading}/>
                <EditableText as="p" value={c.text} editable={editable} onChange={value=>update('text',value)} className={styles.text}/>
                <div className={styles.reaction}>
                  <button type="button" className={styles.heartButton} aria-pressed={liked} aria-label={liked?'Gefällt mir zurücknehmen':'Gefällt mir'} onClick={toggle} disabled={editable}>
                    <span key={pulse} className={styles.heartIcon} data-pulse={pulse>0?'true':undefined}><Heart size={30} strokeWidth={1.8} fill={liked?'currentColor':'none'} aria-hidden="true"/></span>
                    <span>{liked?'Gefällt dir':'Gefällt mir'}</span>
                    {pulse>0&&<MousePointer2 key={`pointer-${pulse}`} className={styles.pointer} size={29} aria-hidden="true"/>}
                  </button>
                  <EditableText as="span" value={c.caption} editable={editable} onChange={value=>update('caption',value)} className={styles.example}/>
                </div>
              </div>
              <div className={styles.screenMark} aria-hidden="true"><Heart size={188} strokeWidth={1.2} fill={liked?'currentColor':'none'}/></div>
            </div>
          </div>
        </div>;
      })}
      {c.primaryLabel&&<div className={styles.outro}><ContentLink href={c.primaryHref} editField="primaryHref" editable={editable} className={styles.action}><EditableText as="span" value={c.primaryLabel} editable={editable} onChange={value=>update('primaryLabel',value)}/><ArrowUpRight size={23} aria-hidden="true"/></ContentLink></div>}
    </div>
  </div>;
}
