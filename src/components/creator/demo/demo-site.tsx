"use client";
import {useEffect,useState} from 'react';
import {isolateWebsiteMedia} from '@/lib/isolated-media';
import type {WebsiteContent} from '@/lib/types';
import {ContentLink,SiteInteractionContext} from '@/components/site/editable';
import {CreatorPublicSiteView} from '@/components/creator/creator-public-site';
import {demoStorageKey,readDemoState} from '@/lib/creator/demo-state';
export function DemoCreatorSite({initialContent,pageSlug}:{initialContent:WebsiteContent;pageSlug:string}){
 const [content,setContent]=useState(()=>isolateWebsiteMedia(initialContent));
 const key=demoStorageKey(initialContent);
 useEffect(()=>{
  const update=()=>setContent(readDemoState(sessionStorage,key,initialContent).state.published);
  const storage=(event:StorageEvent)=>{if(event.storageArea===sessionStorage&&event.key===key)update();};
  const publish=(event:Event)=>{const detail=(event as CustomEvent<{key?:string;published?:WebsiteContent}>).detail;if(!detail||detail.key===key)update();};
  const message=(event:MessageEvent)=>{if(event.origin!==location.origin||event.source!==window.parent||event.data?.type!=='ws:demo-published'||event.data.key!==key)return;const next=event.data.published as WebsiteContent|undefined;if(next?.version===1&&Array.isArray(next.pages)&&next.config?.modules?.creator?.demoBasePath===initialContent.config.modules?.creator?.demoBasePath)setContent(isolateWebsiteMedia(next));};
  update();window.addEventListener('ws:demo-published',publish);window.addEventListener('storage',storage);window.addEventListener('message',message);
  return()=>{window.removeEventListener('ws:demo-published',publish);window.removeEventListener('storage',storage);window.removeEventListener('message',message);};
 },[initialContent,key]);
 useEffect(()=>{if(window.parent!==window)window.parent.postMessage({type:'ws:demo-location',key,path:location.pathname+location.search+location.hash},location.origin);},[key,pageSlug]);
 const page=content.pages.find(p=>p.slug===pageSlug);
 return page?<SiteInteractionContext.Provider value={{isolated:true,localMediaOnly:true}}><CreatorPublicSiteView page={page} site={content.config}/></SiteInteractionContext.Provider>:<main className="system-page"><div><h1>Diese Demo-Seite ist noch nicht verfügbar.</h1><p>Veröffentliche deinen lokalen Entwurf im Demo-CMS oder kehre zum Beispiel zurück.</p><ContentLink href={initialContent.config.modules?.creator?.demoBasePath}>Zur Beispielwebsite</ContentLink></div></main>;
}
