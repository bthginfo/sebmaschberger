"use client";
import dynamic from 'next/dynamic';
import type {AssistantProps} from './assistant';
const FloatingAssistant=dynamic(()=>import('./assistant').then(module=>module.Assistant),{ssr:false});
export function AssistantLoader(props:AssistantProps){return <FloatingAssistant {...props}/>;}
