"use client";
import dynamic from 'next/dynamic';
import type {WebsiteContent} from '@/lib/types';
const Editor=dynamic(()=>import('./demo-cms').then(m=>m.DemoCms),{ssr:false,loading:()=> <div role="status" style={{minHeight:600,padding:30}}>Dein Demo-Editor wird geladen ...</div>});
export function DemoCmsLoader({initialContent}:{initialContent:WebsiteContent}){return <Editor initialContent={initialContent}/>;}
