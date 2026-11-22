'use client';

import { useEffect, useRef, useState } from 'react';
import { Paperclip, Send } from 'lucide-react';
import type { ActorView, ChatMessage, ClientView, Language } from '@/lib/coaching-portal/model';
import { Button, Empty, Field, Section, Status, errorText, request, translator, uid } from './ui';
import { Media } from './client-plan';
import styles from './portal.module.css';

export function Chat({ actor, client, language }: {actor:ActorView;client:ClientView;language:Language}) {
  const t=translator(language), id=client.person.id;
  const [thread,setThread]=useState(client.messages),[text,setText]=useState(''),[issue,setIssue]=useState(''),[busy,setBusy]=useState(false);
  const [file,setFile]=useState<File|null>(null);
  const list=useRef<HTMLDivElement>(null), pending=useRef('');
  const authorized=Boolean(client.program.published?.plan.features.chat);
  useEffect(()=>{
    if(!authorized)return;
    const controller=new AbortController();
    const update=()=>{if(document.visibilityState==='visible')void request<{messages:ChatMessage[]}>('chat?client='+encodeURIComponent(id),undefined,controller.signal).then(result=>setThread(result.messages)).catch(()=>{});};
    const interval=window.setInterval(update,8500);
    document.addEventListener('visibilitychange',update);
    return ()=>{controller.abort();window.clearInterval(interval);document.removeEventListener('visibilitychange',update);};
  },[authorized,id]);
  useEffect(()=>{if(list.current)list.current.scrollTop=list.current.scrollHeight;},[thread.length]);
  async function send() {
    if(busy||(!text.trim()&&!file))return;
    setBusy(true);setIssue('');
    try {
      let media:string|undefined;
      if(file){
        const payload=new FormData();payload.append('file',file);payload.append('purpose','chat');payload.append('client',id);
        media=(await request<{href:string}>('upload',payload)).href;
      }
      pending.current ||= uid();
      const message=await request<ChatMessage>('chat',{id:pending.current,client:id,text:text.trim(),...(media?{media}: {})});
      setThread(current=>current.some(v=>v.id===message.id)?current:[...current,message]);
      setText('');setFile(null);pending.current='';
    }catch(error){setIssue(errorText(error));}finally{setBusy(false);}
  }
  return <><header className={styles.pageHead}><div><h1>{t('Nachrichten','Messages')}</h1><p>{actor.role==='client'?t('Sebastian und sein Betreuungsteam antworten dir hier.','Sebastian and his coaching team reply here.'):client.person.name}</p></div></header>
    <Section title={actor.role==='client'?'Sebastian Coaching':client.person.name}>
      {!authorized?<Empty title={t('Der Chat öffnet mit der Planfreigabe','Chat opens with the published plan')}/>:<>
      <div ref={list} className={styles.room} role="log" aria-label={t('Nachrichtenverlauf','Conversation')}>
        {!thread.length&&<Empty title={t('Platz für deine erste Nachricht','Send the first message')}/>}
        {thread.map(message=><div key={message.id} data-self={message.who===(actor.role==='client'?'client':'team')} className={styles.message}>
          <small>{message.who==='team'?(actor.role==='client'?'Sebastian Coaching':message.sender??'Team'):client.person.name} · {new Intl.DateTimeFormat(language,{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'}).format(new Date(message.at))}</small>
          {message.text&&<p>{message.text}</p>}{message.media&&<Media href={message.media} title={t('Chat-Anhang','Chat attachment')} language={language}/>}</div>)}
      </div>
      <form className={styles.chatForm} onSubmit={event=>{event.preventDefault();void send();}}>
        <Field label={t('Nachricht schreiben','Write a message')}><textarea value={text} maxLength={3000} onChange={event=>{setText(event.target.value);pending.current='';}}/></Field>
        <Button primary type="submit" loading={busy} disabled={!text.trim()&&!file}><Send size={17}/>{t('Senden','Send')}</Button>
        <Field label={<><Paperclip size={14}/> {file?.name??t('Anhang bis 4 MB','Attachment up to 4 MB')}</>}>
          <input type="file" key={file?file.name:'none'} onChange={event=>{setFile(event.target.files?.[0]??null);pending.current='';}} accept="application/pdf,image/jpeg,image/png,image/webp,video/mp4"/></Field>
        {file&&<Button quiet onClick={()=>setFile(null)}>{t('Anhang entfernen','Remove attachment')}</Button>}
      </form>{issue&&<Status bad text={issue}/>}
    </>}</Section></>;
}
