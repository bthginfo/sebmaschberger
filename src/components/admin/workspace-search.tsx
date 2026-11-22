"use client";
import { useAdminLanguage } from "./admin-language";
import {useEffect,useState} from 'react';
import {Search,ChevronRight,Command} from 'lucide-react';
import {Modal,SearchField} from './admin-ui';
import {findWorkspaceAreas} from '@/lib/workspace-search';
import type {AdminView} from './admin-app';
type Item={id:AdminView;label:string};
export function WorkspaceSearch({items,onNavigate}:{items:readonly Item[];onNavigate:(view:AdminView)=>unknown}){
  const { t: adminText } = useAdminLanguage();
 const[open,setOpen]=useState(false),[query,setQuery]=useState('');
 const results=findWorkspaceAreas(items,query);
 function navigate(id:AdminView){setOpen(false);onNavigate(id);}
 useEffect(()=>{
  const start=()=>{setQuery('');setOpen(true);};
  const key=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();setQuery('');setOpen(value=>!value);}};
  window.addEventListener('keydown',key);window.addEventListener('cms:open-search',start);
  return()=>{window.removeEventListener('keydown',key);window.removeEventListener('cms:open-search',start);};
 },[]);
 return <><button type="button" className="cms-workspace-search" onClick={()=>{setQuery('');setOpen(true);}}><Search size={16}/><span>{adminText("Schnell finden")}</span><kbd>⌘ K</kbd></button>{open&&<Modal title={adminText("Wohin möchten Sie?")} onClose={()=>setOpen(false)}><div className="cms-workspace-search-dialog" onKeyDown={event=>{
  if(event.key==='Enter'&&event.target instanceof HTMLInputElement&&query.trim()&&results[0]){event.preventDefault();navigate(results[0].id);}
 }}><SearchField value={query} onChange={setQuery} label={adminText("Bereich suchen")} placeholder={adminText("Seiten, Medien, Post-Planer …")}/><div className="cms-command-results">{results.map(item=><button key={item.id} type="button" onClick={()=>navigate(item.id)}><span>{item.label}</span><ChevronRight size={17}/></button>)}{!results.length&&<p>{adminText("Kein Bereich gefunden. Versuchen Sie zum Beispiel „Social“ oder „Seiten“.")}</p>}</div><p className="cms-command-hint"><Command size={13}/> {adminText("K öffnet die Suche · Esc schließt das Fenster")}</p></div></Modal>}</>;
}
