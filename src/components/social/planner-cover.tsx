"use client";
import {useEffect,useRef,useState} from 'react';
import {projectSchema,type SocialProject} from '@/lib/social/model';
import {isUploadedSource,isReferenceSource,type PublicationRecord} from '@/lib/social/publishing/model';
import {CanvasPreview} from './canvas-preview';
export function PlannerCover({item}:{item:PublicationRecord}){
 const host=useRef<HTMLSpanElement>(null),[project,setProject]=useState<SocialProject|null>(null);
 const id=item.id,hash=item.source.snapshotHash,projectId=!isUploadedSource(item.source)&&!isReferenceSource(item.source)?item.source.projectId:null;
 useEffect(()=>{
  if(!host.current||!projectId)return;
  const controller=new AbortController();let active=true;setProject(null);
  const load=async()=>{try{
   const response=await fetch('/api/admin/social/planner/'+encodeURIComponent(id),{signal:controller.signal,credentials:'same-origin'});
   if(!response.ok)return;const result=await response.json();
   if(!active||!result.ok||result.result?.entry?.id!==id||result.result?.entry?.source?.snapshotHash!==hash)return;
   const parsed=projectSchema.safeParse(result.result.project);
   if(parsed.success&&parsed.data.id===projectId)setProject(parsed.data);
  }catch{/* Keep the card's format icon when the frozen preview is unavailable. */}};
  const observer=new IntersectionObserver(records=>{if(records.some(record=>record.isIntersecting)){observer.disconnect();void load();}},{rootMargin:'120px'});
  observer.observe(host.current);return()=>{active=false;observer.disconnect();controller.abort();};
 },[id,hash,projectId]);
 return <span ref={host} className="schedule-live-cover" aria-hidden="true">{project&&<CanvasPreview project={project} index={item.carousel?0:item.slideIndex} thumbnail label={item.source.title}/>}</span>;
}
