"use client";

import dynamic from 'next/dynamic';
import {useEffect,useRef,useState} from 'react';
import {Button,LoaderCircle,Notice,RefreshCw,api,errorMessage} from './admin-ui';
import type {SocialWorkspace} from '@/lib/social/model';
import type {AssistantActionId,SocialSuggestion} from '@/lib/assistant/model';
import type {SocialNavigationGuard} from '@/components/social/social-workflow-nav';
import { useAdminLanguage } from "@/components/admin/admin-language";

const Studio=dynamic(()=>import('@/components/social/social-studio').then(module=>module.SocialStudio),{
 ssr:false,
 loading:()=> <div className="cms-empty" style={{flex:1}} role="status"><LoaderCircle className="cms-spin" size={24} aria-hidden="true"/><p>Zeichenfläche wird geladen …</p></div>
});

/** Kept outside the ordinary admin/bootstrap path: no editor, fonts or media
 * library is loaded until this saved, explicitly enabled module is opened. */
export function SocialStudioLoader({onDirtyChange,assistantEnabled=false,suggestion,publishingEnabled=false,onOpenPlanner,onGuardReady,requestedProject,onAssistantNavigate}:{onDirtyChange:(dirty:boolean)=>void;assistantEnabled?:boolean;suggestion?:{id:string;post:SocialSuggestion};publishingEnabled?:boolean;onOpenPlanner?:(id?:string,contextId?:string)=>void;onGuardReady?:(guard:SocialNavigationGuard|null)=>void;requestedProject?:{id:string;requestId:string};onAssistantNavigate?:(id:AssistantActionId)=>void}){
  const { t } = useAdminLanguage();
 const[workspace,setWorkspace]=useState<SocialWorkspace|null>(null);
 const[error,setError]=useState('');
 const[attempt,setAttempt]=useState(0);
 const request=useRef<Promise<{ok:true;result:SocialWorkspace}>|null>(null);
 useEffect(()=>{
  let active=true;
  const pending=request.current??=api<{ok:true;result:SocialWorkspace}>('/api/admin/social');
  void pending.then(response=>{if(active){setWorkspace(response.result);setError('');}}).catch(reason=>{if(active)setError(errorMessage(reason));});
  return()=>{active=false;};
 },[attempt]);
 useEffect(()=>()=>onDirtyChange(false),[onDirtyChange]);
 if(error)return <section className="cms-page" style={{flex:1}}><div className="cms-page-heading"><div><h1>{t("Social-Studio")}</h1><p>{t("Ihre Entwürfe konnten gerade nicht geladen werden.")}</p></div></div><Notice tone="error">{error}</Notice><Button onClick={()=>{request.current=null;setError('');setAttempt(value=>value+1);}}><RefreshCw size={16}/>{t("Erneut laden")}</Button></section>;
 if(!workspace)return <section className="cms-empty" style={{flex:1}} role="status" aria-live="polite"><LoaderCircle className="cms-spin" size={24} aria-hidden="true"/><p>{t("Social-Studio wird geöffnet …")}</p></section>;
 return <Studio onAssistantNavigate={onAssistantNavigate} onOpenPlanner={publishingEnabled?onOpenPlanner:undefined} onGuardReady={onGuardReady} requestedProject={requestedProject} initial={workspace} assistantEnabled={assistantEnabled} initialSuggestion={suggestion} onDirtyChange={onDirtyChange}/>;
}
