"use client";
import dynamic from 'next/dynamic';
import {useEffect,useRef,useState} from 'react';
import {Button,LoaderCircle,Notice,RefreshCw,api,errorMessage} from './admin-ui';
import type {PlannerWorkspace} from '@/lib/social/publishing/model';
import type {SocialNavigationGuard} from '@/components/social/social-workflow-nav';
import { useAdminLanguage } from "@/components/admin/admin-language";
const Planner=dynamic(()=>import('@/components/social/post-planner').then(module=>module.PostPlanner),{ssr:false,loading:()=> <div className="cms-empty" style={{flex:1}} role="status"><LoaderCircle size={24} className="cms-spin" aria-hidden="true"/><p>Post-Planer wird geöffnet …</p></div>});
export function PostPlannerLoader({onDirtyChange,onOpenSource,onBack,onGuardReady,initialProjectId,connectionRequest}:{onDirtyChange:(dirty:boolean)=>void;onOpenSource:(id:string)=>void;onBack:()=>void;onGuardReady?:(guard:SocialNavigationGuard|null)=>void;initialProjectId?:string;connectionRequest?:string}){
  const { t } = useAdminLanguage();
 const[workspace,setWorkspace]=useState<PlannerWorkspace|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),request=useRef<Promise<{ok:true;result:PlannerWorkspace}>|null>(null);
 useEffect(()=>{let active=true;const pending=request.current??=api<{ok:true;result:PlannerWorkspace}>('/api/admin/social/planner');void pending.then(value=>{if(active)setWorkspace(value.result);}).catch(reason=>{if(active)setError(errorMessage(reason));});return()=>{active=false;};},[attempt]);
 useEffect(()=>()=>onDirtyChange(false),[onDirtyChange]);
 if(error)return <section className="cms-page" style={{flex:1}}><h1>{t("Post-Planer")}</h1><Notice tone="error">{error}</Notice><Button onClick={()=>{request.current=null;setError('');setAttempt(value=>value+1);}}><RefreshCw size={16}/>{t("Erneut laden")}</Button></section>;
 if(!workspace)return <div className="cms-empty" style={{flex:1}} role="status"><LoaderCircle size={24} className="cms-spin" aria-hidden="true"/><p>{t("Planungen laden …")}</p></div>;
 return <Planner initial={workspace} onDirtyChange={onDirtyChange} onOpenSource={onOpenSource} onBack={onBack} onGuardReady={onGuardReady} initialProjectId={initialProjectId} connectionRequest={connectionRequest}/>;
}
