"use client";

import {useEffect,useId,useRef,useState} from 'react';
import {ArrowDown,ArrowRight,ArrowUpRight,CalendarDays,Check,Globe,Play,RotateCcw,Shirt} from 'lucide-react';
import type {ContentItem,SectionContent} from '@/lib/types';
import type {CreatorSectionProps} from '@/lib/creator/types';
import {journeyDetail,journeyInquiryHref,journeyItems,journeyMode} from '@/lib/creator/journey';
import {ContentLink,EditableChoice,EditableText} from '@/components/site/editable';
import {ContentIcon} from '@/components/site/content-icon';
import {useSectionHeadingLevel} from '@/components/site/heading-level';
import {creatorCopy,itemCopy,updateCreatorItem} from '../marketing/creator-copy';
import {CreatorPhoto} from '../marketing/creator-photo';
import styles from './journey.module.css';

export function CreatorJourney({section,editable=false,onChange}:CreatorSectionProps){
  const c=section.content,items=journeyItems(c.items),ui=creatorCopy(section),heading=useSectionHeadingLevel(section.id);
  const [chosen,setChosen]=useState(()=>items.find(item=>item.tags?.includes('default'))?.id??items[0]?.id??'');
  const [flow,setFlow]=useState<0|1|2>(0),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const active=items.find(item=>item.id===chosen)??items[0],copy=active?itemCopy(active):()=>'';
  const phase=editable?2:flow,stageId=useId();
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  const update=<K extends keyof SectionContent>(key:K,value:SectionContent[K])=>onChange?.({...section,content:{...c,[key]:value}});
  const editItem=(item:ContentItem,patch:Partial<ContentItem>)=>{const index=c.items?.findIndex(value=>value.id===item.id)??-1;if(index>=0)onChange?.(updateCreatorItem(section,index,patch));};
  const detail=(key:string,value:string)=>{if(active)editItem(active,journeyDetail(active,key,value));};
  const select=(id:string)=>{if(timer.current)clearTimeout(timer.current);setChosen(id);setFlow(0);};
  const advance=()=>{
    if(editable||flow===1)return;if(timer.current)clearTimeout(timer.current);
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){setFlow(2);return;}
    setFlow(1);timer.current=setTimeout(()=>{setFlow(2);timer.current=null;},820);
  };
  const screen=active?journeyMode(active):'event';
  return <div className={styles.journey} data-creator-journey="" data-phase={phase} data-mode={screen} data-editable={editable?'true':undefined}>
    <header className={styles.intro}>
      <EditableText as={heading} value={c.heading} editable={editable} onChange={value=>update('heading',value)}/>
      <EditableText as="p" value={c.text} editable={editable} onChange={value=>update('text',value)}/>
    </header>
    {active&&<>
      <div className={styles.choices} role="group" aria-label={ui('choose')}>
        {items.map(item=><EditableChoice key={item.id} editable={editable} onChoose={()=>select(item.id)} type="button" aria-pressed={active.id===item.id} aria-controls={stageId} className={styles.choice} data-item-id={item.id} data-active={active.id===item.id?'true':undefined}>
          <ContentIcon name={item.icon} size={18}/><EditableText as="span" value={item.title} editable={editable} onChange={title=>editItem(item,{title})}/><ArrowUpRight size={16} aria-hidden="true"/>
        </EditableChoice>)}
      </div>
      <div id={stageId} className={styles.scene} key={active.id} data-item-id={active.id}>
        <div className={styles.source}>
          <p className={styles.stageLabel}>{ui('source')}</p>
          <div className={styles.sourcePost}>
            {active.image&&<CreatorPhoto image={active.image} editable={editable} onChange={image=>editItem(active,{image})} className={styles.sourceImage} sizes="(max-width:700px) 25vw, 20vw"/>}
            <div className={styles.sourceCopy}>
              <div className={styles.sourceType}><Play size={14} fill="currentColor" aria-hidden="true"/><EditableText as="span" value={copy('sourceType')} editable={editable} onChange={value=>detail('sourceType',value)}/></div>
              <EditableText as="p" value={copy('sourceTitle')} editable={editable} onChange={value=>detail('sourceTitle',value)}/>
              <span className={styles.example}>{ui('example')}</span>
            </div>
          </div>
        </div>
        <div className={styles.connector} aria-hidden="true"><span/><i/><ArrowRight size={19}/><ArrowDown size={19}/></div>
        <div className={styles.website}>
          <p className={styles.stageLabel}>{ui('website')}</p>
          <div className={styles.window}>
            <div className={styles.chrome}><span aria-hidden="true"><i/><i/><i/></span><EditableText as="span" value={c.secondaryLabel} editable={editable} onChange={value=>update('secondaryLabel',value)}/><Globe size={12} aria-hidden="true"/></div>
            <div className={styles.siteHeader}><EditableText as="span" value={c.subheading} editable={editable} onChange={value=>update('subheading',value)}/><span aria-hidden="true"><i/><i/></span></div>
            <div className={styles.siteBody}>
              <div className={styles.siteCopy}>
                <EditableText as="h3" value={active.meta} editable={editable} onChange={meta=>editItem(active,{meta})}/>
                <EditableText as="p" value={copy('siteText')} editable={editable} onChange={value=>detail('siteText',value)}/>
              </div>
              <div className={styles.sitePoster}>
                <span className={styles.posterIcon} aria-hidden="true">{screen==='shop'?<Shirt size={72} strokeWidth={1.25}/>:screen==='kit'?<ContentIcon name="BriefcaseBusiness" size={59}/>:<CalendarDays size={59} strokeWidth={1.25}/>}</span>
                <EditableText as="span" value={copy('siteMeta')} editable={editable} onChange={value=>detail('siteMeta',value)}/>
              </div>
              <EditableChoice editable={editable} onChoose={advance} type="button" className={styles.previewAction} aria-disabled={!editable&&flow===1||undefined} aria-controls={`${stageId}-outcome`} aria-expanded={phase===2}>
                <EditableText as="span" value={editable||flow===0?active.label:flow===1?ui('running'):ui('again')} editable={editable} onChange={label=>editItem(active,{label})}/>{phase===2?<RotateCcw size={17} aria-hidden="true"/>:<ArrowUpRight size={18} aria-hidden="true"/>}
              </EditableChoice>
            </div>
          </div>
        </div>
        <div className={`${styles.connector} ${styles.secondConnector}`} aria-hidden="true"><span/><i/><ArrowRight size={19}/><ArrowDown size={19}/></div>
        <div className={styles.outcome} id={`${stageId}-outcome`}>
          <p className={styles.stageLabel}>{ui('outcome')}</p>
          <div className={styles.outcomeSheet}>
            <div className={styles.outcomeTop}><ContentIcon name={active.icon} size={21}/><EditableText as="span" value={copy('outcomeLabel')} editable={editable} onChange={value=>detail('outcomeLabel',value)}/></div>
            {phase===2?<div className={styles.result}>
              <span className={styles.demoStatus}><Check size={14} aria-hidden="true"/>{ui('demoState')}</span>
              <EditableText as="h3" value={copy('outcomeTitle')} editable={editable} onChange={value=>detail('outcomeTitle',value)}/>
              <dl className={styles.exampleFields}>{[1,2].map(index=><div key={index}><dt><EditableText as="span" value={copy(`field${index}Label`)} editable={editable} onChange={value=>detail(`field${index}Label`,value)}/></dt><dd><EditableText as="span" value={copy(`field${index}Value`)} editable={editable} onChange={value=>detail(`field${index}Value`,value)}/></dd></div>)}</dl>
              <EditableText as="p" value={copy('outcomeText')} editable={editable} onChange={value=>detail('outcomeText',value)}/>
            </div>:<div className={styles.resultWaiting}><ArrowUpRight size={42} strokeWidth={1.3} aria-hidden="true"/><EditableText as="h3" value={copy('outcomeTitle')} editable={editable} onChange={value=>detail('outcomeTitle',value)}/><p>{ui('idle')}</p></div>}
          </div>
        </div>
      </div>
      <div className={styles.build}>
        <div><p className={styles.buildLabel}>{ui('build')}</p><EditableText as="p" value={active.text} editable={editable} onChange={text=>editItem(active,{text})}/></div>
        {c.primaryLabel&&<ContentLink href={journeyInquiryHref(c,active,copy('inquiryMessage'),ui('inquirySubject'))} editable={editable} className={styles.inquiry}><EditableText as="span" value={c.primaryLabel} editable={editable} onChange={value=>update('primaryLabel',value)}/><ArrowUpRight size={20} aria-hidden="true"/></ContentLink>}
      </div>
    </>}
    <EditableText as="p" value={c.caption} editable={editable} onChange={value=>update('caption',value)} className={styles.caption}/>
    <p className={styles.announcement} role="status" aria-live="polite" aria-atomic="true">{flow===2&&!editable?copy('complete'):''}</p>
  </div>;
}
