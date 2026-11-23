'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, ClipboardList, Copy, Layers, Mail, Plus, RefreshCw, UserRound, Users } from 'lucide-react';
import type { Access, ActorView, ClientView, Language, Plan, PortalSnapshot, Profile, Program } from '@/lib/coaching-portal/model';
import { PlanEditor } from './plan-editor';
import { Chat } from './chat';
import { DeviceConfig, Progress } from './devices';
import { PortalHelp } from './help';
import { Button, Empty, Field, Input, Modal, Panel, Section, Status, copyText, errorText, request, translator } from './ui';
import styles from './portal.module.css';

type InviteResult={link:string;person:Access;delivery:'copy'|'sent'|'failed'};
function InviteForm({language,actor,close,reload}:{language:Language;actor:ActorView;close:()=>void;reload:()=>Promise<void>}) {
  const t=translator(language);
  const [busy,setBusy]=useState(false),[issue,setIssue]=useState(''),[result,setResult]=useState<InviteResult>(),[copied,setCopied]=useState(false);
  return <Modal title={result?t('Einladung bereit','Invitation ready'):t('Zugang einladen','Invite an account')} close={close}>
    {result?<div className={styles.stack}>
      <strong>{result.person.name}</strong><Field label={t('Persönlicher Link · 72 Stunden','Personal link · 72 hours')}><Input readOnly value={result.link}/></Field>
      <p className={styles.copy}>{result.delivery==='sent'?t('Die Einladung wurde per E-Mail versendet.','The invitation was sent by email.'):
        result.delivery==='failed'?t('Der Mailversand ist offen. Du kannst diesen Link persönlich weitergeben.','Email delivery is pending. You can share the link yourself.'):t('Gib diesen Link persönlich weiter.','Share this link directly.')}</p>
      <div className={styles.actions}><Button primary onClick={()=>void copyText(result.link).then(()=>setCopied(true)).catch(error=>setIssue(errorText(error)))}><Copy size={16}/>{copied?t('Kopiert','Copied'):t('Einladungslink kopieren','Copy invite link')}</Button><Button onClick={close}>{t('Fertig','Done')}</Button></div>
    </div>:<form className={styles.form} onSubmit={event=>{
      event.preventDefault();setBusy(true);setIssue('');
      const data=new FormData(event.currentTarget);
      void request<InviteResult>('invite',{name:data.get('name'),email:data.get('email'),role:data.get('role')||'client',language:data.get('language'),send:data.has('send')})
        .then(saved=>{setResult(saved);return reload();}).catch(error=>setIssue(errorText(error))).finally(()=>setBusy(false));
    }}>
      <Field label={t('Vollständiger Name','Full name')}><Input name="name" maxLength={140} required/></Field>
      <Field label="E-Mail"><Input name="email" type="email" required/></Field>
      <div className={styles.fields}>
        {actor.role==='owner'&&<Field label={t('Zugang','Account')}><select name="role" defaultValue="client"><option value="client">{t('Kunde','Client')}</option><option value="coach">{t('Betreuer','Coach')}</option></select></Field>}
        <Field label={t('Sprache','Language')}><select name="language" defaultValue={language}><option value="de">Deutsch</option><option value="en">English</option></select></Field>
      </div>
      <label><input type="checkbox" name="send"/> {t('Einladung zusätzlich per E-Mail versenden','Also email the invitation')}</label>
      <Button primary loading={busy} type="submit"><Mail size={16}/>{t('Einladung erstellen','Create invitation')}</Button>
    </form>}
    {issue&&<Status bad text={issue}/>}
  </Modal>;
}
function stateLabel(status:Access['status'],language:Language) {
  const t=translator(language);
  return status==='active'?t('Aktiv','Active'):status==='invited'?t('Eingeladen','Invited'):t('Pausiert','Paused');
}
function CoachCalendar({client,language,open}:{client:ClientView;language:Language;open:()=>void}) {
  const t=translator(language), plan=client.program.published?.plan??client.program.draft;
  const date=(offset:number)=>{
    const value=new Date(plan.start+'T12:00Z');value.setUTCDate(value.getUTCDate()+offset);return value.toISOString().slice(0,10);
  };
  const [week,setWeek]=useState(0);
  const rows=plan.items.filter(item=>item.day>=week*7&&item.day<(week+1)*7&&plan.features[item.kind]).sort((a,b)=>a.day-b.day||a.at.localeCompare(b.at));
  return <><header className={styles.pageHead}><div><h1>{t('Kundenkalender','Client calendar')}</h1><p>{client.person.name} · {plan.title}</p></div><Button primary onClick={open}><CalendarDays size={16}/>{t('Im Wocheneditor planen','Open the weekly editor')}</Button></header>
    <Section title={t('Woche','Week')+' '+(week+1)} action={<select aria-label={t('Woche wählen','Choose week')} value={week} onChange={event=>setWeek(Number(event.target.value))}>{Array.from({length:plan.weeks},(_,index)=><option key={index} value={index}>{t('Woche','Week')} {index+1}</option>)}</select>}>
      <div className={styles.items}>{rows.map(item=><div key={item.id} className={styles.subcard}><span className={styles.label}>{date(item.day)} {item.at}</span><h3>{item.title}</h3>
        {item.minutes>0&&<span className={styles.copy}>{item.minutes} min</span>}</div>)}</div>
      {!rows.length&&<Empty title={t('Keine geplanten Einträge in dieser Woche','No activities planned this week')}/>}
    </Section></>;
}

export function CoachWorkspace({ snapshot,language,tab,open,selection,reload }: {
  snapshot:PortalSnapshot;language:Language;tab:string;open:(tab:string)=>void;selection:(id:string)=>void;reload:()=>Promise<void>;
}) {
  const t=translator(language),{actor,client}=snapshot;
  const [search,setSearch]=useState(''),[invite,setInvite]=useState(false),[busy,setBusy]=useState(false),[issue,setIssue]=useState(''),[done,setDone]=useState('');
  const [draft,setDraft]=useState<Plan|undefined>(client?.program.draft),[profile,setProfile]=useState<Profile|undefined>(client?.program.profile);
  const [version,setVersion]=useState(client?.program.revision??0),[localProgram,setLocalProgram]=useState<Program|undefined>(client?.program);
  const [renewed,setRenewed]=useState<InviteResult>(),[assigned,setAssigned]=useState(client?.person.coaches??[]);
  useEffect(()=>{
    if(!client)return;
    setDraft(client.program.draft);setProfile(client.program.profile);setVersion(client.program.revision);setLocalProgram(client.program);setAssigned(client.person.coaches);
  },[client?.person.id,client?.program.revision]);
  const dirty=JSON.stringify(draft)!==JSON.stringify(localProgram?.draft)||JSON.stringify(profile)!==JSON.stringify(localProgram?.profile);
  useEffect(()=>{
    if(!dirty)return;
    const stop=(event:BeforeUnloadEvent)=>{event.preventDefault();};
    window.addEventListener('beforeunload',stop);
    return ()=>window.removeEventListener('beforeunload',stop);
  },[dirty]);
  async function change(label:string,operation:()=>Promise<void>) {
    setBusy(true);setIssue('');setDone('');
    try{await operation();if(label)setDone(label);}catch(error){setIssue(errorText(error));throw error;}finally{setBusy(false);}
  }
  async function savePlan(publish:boolean) {
    if(!draft||!profile||!client)return;
    await change(publish?t('Plan freigegeben','Plan published'):t('Entwurf gespeichert','Draft saved'),async()=>{
      const value=await request<Program>('plan',{id:client.person.id,revision:version,draft,profile,publish});
      setVersion(value.revision);setDraft(value.draft);setProfile(value.profile);setLocalProgram(value);
      await reload();
    }).catch(error=>{if(publish)throw error;});
  }
  const showClient=(id:string)=>{
    if(dirty&&!window.confirm(t('Zum anderen Kunden wechseln und lokale Änderungen verwerfen?','Switch client and discard local changes?')))return;
    selection(id);
  };
  const current=client??null;
  const status=(item:Access)=>stateLabel(item.status,language);
  const words = (value:string) => value.normalize('NFKD').replace(/\p{Mark}/gu,'').toLocaleLowerCase(language).replaceAll('ß','ss');
  const terms = words(search.trim()).split(/\s+/u).filter(Boolean);
  const filtered=snapshot.directory.filter(item=>terms.every(term=>words(item.name+' '+item.email).includes(term)));
  return <div className={styles.stack}>
    {issue&&<Status bad text={issue}/>} {done&&<Status text={done}/>}
    {current&&!['people','help','devices','library'].includes(tab)&&<Field label={t('Kundenansicht','Client view')}>
      <select value={current.person.id} onChange={event=>showClient(event.target.value)}>
        {snapshot.directory.map(item=><option key={item.id} value={item.id}>{item.name} · {status(item)}</option>)}
      </select></Field>}
    {tab==='help'&&<PortalHelp actor={actor} language={language} open={open}/>}
    {tab==='devices'&&actor.role==='owner'&&<><header className={styles.pageHead}><div><h1>{t('Geräte-Schnittstellen','Device connections')}</h1><p>{t('Lege die Callback-Adresse beim Anbieter an und speichere den App-Zugang hier.','Register the callback with the provider, then save the app credentials here.')}</p></div><a className={styles.button} href="/admin/google-ads">{t('Google Ads','Google Ads')}</a></header><DeviceConfig language={language}/></>}
    {tab==='people'&&<>
      <header className={styles.pageHead}><div><h1>{t('Coaching-Kunden','Coaching clients')}</h1><p>{t('Kunden, persönliche Zugänge und Teamzuordnungen.','Clients, individual accounts and coach assignments.')}</p></div>
      <Button primary onClick={()=>setInvite(true)}><Plus size={17}/>{t('Einladung erstellen','Create invitation')}</Button></header>
      <div className={styles.statGrid}>
        <div className={styles.stat}><Users size={17}/><b>{snapshot.directory.filter(item=>item.status==='active').length}</b><span>{t('Aktive Kunden','Active clients')}</span></div>
        <div className={styles.stat}><Mail size={17}/><b>{snapshot.directory.filter(item=>item.status==='invited').length}</b><span>{t('Offene Einladungen','Pending invitations')}</span></div>
        <div className={styles.stat}><ClipboardList size={17}/><b>{current?.logs.filter(log=>log.kind==='checkin'&&log.done).length??0}</b><span>{t('Check-ins im gewählten Profil','Check-ins for selected client')}</span></div>
      </div>
      <div className={styles.grid}><Section title={t('Kunden auswählen','Choose clients')}>
        <div className={styles.stack}><Field label={t('Name oder E-Mail suchen','Search by name or email')}><Input type="search" name="client-search" value={search} onChange={event=>setSearch(event.target.value)} placeholder={t('Suchen …','Search…')}/></Field>
          {filtered.map(item=><button key={item.id} type="button" className={styles.actionRow} aria-pressed={item.id===current?.person.id} onClick={()=>showClient(item.id)}>
            <span className={styles.rowIcon}><UserRound size={18}/></span><span><strong>{item.name}</strong><small>{item.email}</small></span><span className={styles.badge}>{status(item)}</span></button>)}
          {!filtered.length&&<Empty title={search.trim()?t('Keine passenden Kunden','No matching clients'):t('Keine Kunden in dieser Ansicht','No clients in this view')}
            text={search.trim()?undefined:t('Beginne mit einer persönlichen Einladung.','Start with a personal invitation.')}
            action={search.trim()?<Button quiet onClick={()=>setSearch('')}>{t('Suche zurücksetzen','Reset search')}</Button>:undefined}/>}
        </div></Section>
        {current&&<Section title={current.person.name} action={<span className={styles.badge}>{status(current.person)}</span>}><div className={styles.stack}>
          <p className={styles.copy}>{current.person.email} · {current.person.language.toUpperCase()}</p>
          <div className={styles.actions}><Button primary onClick={()=>open('editor')}><ClipboardList size={15}/>{t('Plan bearbeiten','Edit plan')}</Button><Button quiet onClick={()=>open('progress')}>{t('Verlauf ansehen','View history')}</Button></div>
          {actor.role==='owner'&&<>
            <h3>{t('Zuständiges Team','Assigned team')}</h3>
            {snapshot.coaches.filter(v=>v.status!=='paused').map(coach=><label key={coach.id}>
              <input type="checkbox" checked={assigned.includes(coach.id)} onChange={event=>setAssigned(event.target.checked?[...assigned,coach.id]:assigned.filter(id=>id!==coach.id))}/> {coach.name}
            </label>)}
            {snapshot.coaches.length>0&&<Button loading={busy} onClick={()=>void change(t('Zuordnung gespeichert','Assignments saved'),async()=>{await request('assign',{id:current.person.id,coaches:assigned});await reload();}).catch(()=>{})}>{t('Zuordnung speichern','Save assignment')}</Button>}
            <div className={styles.actions}>
              <Button quiet loading={busy} onClick={()=>void change('',async()=>{setRenewed(await request<InviteResult>('renew',{id:current.person.id,send:false}));await reload();}).catch(()=>{})}><RefreshCw size={15}/>{t('Neuen Einladungslink','New invitation link')}</Button>
              <Button quiet loading={busy} onClick={()=>void change(t('Zugang aktualisiert','Account updated'),async()=>{await request('pause',{id:current.person.id,paused:current.person.status!=='paused'});await reload();}).catch(()=>{})}>
                {current.person.status==='paused'?t('Zugang aktivieren','Activate account'):t('Zugang pausieren','Pause account')}</Button></div>
          </>}
          <a href={'/api/coaching-portal/export?client='+current.person.id} className={styles.resource}>{t('Kundenverlauf exportieren','Export client history')}</a>
        </div></Section>}
      </div>
      {actor.role==='owner'&&snapshot.coaches.length>0&&<Section title={t('Betreuungsteam','Coaching team')}>
        <div className={styles.items}>{snapshot.coaches.map(coach=><div key={coach.id} className={styles.subcard+' '+styles.stack}>
          <strong>{coach.name}</strong><span className={styles.copy}>{coach.email} · {status(coach)}</span>
          <div className={styles.actions}><Button quiet loading={busy} onClick={()=>void change(t('Zugang aktualisiert','Account updated'),async()=>{await request('pause',{id:coach.id,paused:coach.status!=='paused'});await reload();}).catch(()=>{})}>{coach.status==='paused'?t('Aktivieren','Activate'):t('Pausieren','Pause')}</Button>
          <Button quiet loading={busy} onClick={()=>void change('',async()=>{setRenewed(await request<InviteResult>('renew',{id:coach.id,send:false}));await reload();}).catch(()=>{})}>{t('Einladungslink erneuern','Renew invite link')}</Button></div>
        </div>)}</div>
      </Section>}
    </>}
    {tab==='editor'&&current&&profile&&draft&&<PlanEditor key={current.person.id} client={current.person} draft={draft} change={setDraft} profile={profile} changeProfile={setProfile}
      library={snapshot.library} saveLibrary={value=>void change(t('Vorlage gesichert','Template saved'),async()=>{await request('library',value);await reload();}).catch(()=>{})}
      savePlan={savePlan} busy={busy} language={language} published={Boolean(localProgram?.published)}/>}
    {tab==='calendar'&&current&&<CoachCalendar key={current.person.id} client={current} language={language} open={()=>open('editor')}/>}
    {tab==='chat'&&current&&<Chat key={current.person.id} actor={actor} client={current} language={language}/>}
    {tab==='progress'&&current&&<Progress key={current.person.id} client={current} language={language} reload={reload} staff/>}
    {tab==='library'&&<Section title={t('Vorlagen und Inhalte','Templates and content')} action={<Layers size={19}/>}>
      <div className={styles.items}>{snapshot.library.map(item=><div className={styles.subcard+' '+styles.stack} key={item.id}><strong>{item.title}</strong>
        <span className={styles.copy}>{item.kind==='plan'?t('Planvorlage','Plan template'):t('Einzelner Eintrag','Individual item')}</span>
        <div className={styles.actions}><Button quiet onClick={()=>open('editor')}>{t('Im Planeditor einsetzen','Use in plan editor')}</Button>
        {(actor.role==='owner'||item.owner===actor.id)&&<Button quiet onClick={()=>{if(window.confirm(t('Diese Vorlage entfernen?','Remove this template?')))void change(t('Vorlage entfernt','Template removed'),async()=>{await request('library-remove',{id:item.id});await reload();}).catch(()=>{});}}>{t('Entfernen','Remove')}</Button>}</div>
      </div>)}</div>
      {!snapshot.library.length&&<Empty title={t('Pläne, Rezepte und Übungen als Vorlage speichern','Save plans, recipes and exercises as templates')}
        text={t('Im Planeditor erstellst du Vorlagen aus dem ganzen Plan oder aus einem einzelnen Eintrag.','In the editor, create templates from a whole plan or an individual item.')}/>}
    </Section>}
    {!current&&['editor','calendar','chat','progress'].includes(tab)&&<Section title={t('Wähle zuerst einen Kunden','Choose a client first')}>
      <Button primary onClick={()=>open('people')}><Users size={17}/>{t('Zu den Kunden','View clients')}</Button></Section>}
    {invite&&<InviteForm language={language} actor={actor} close={()=>setInvite(false)} reload={reload}/>}
    {renewed&&<Modal title={t('Neuer Einladungslink','New invite link')} close={()=>setRenewed(undefined)}><div className={styles.stack}>
      <Field label={t('Persönlicher Link','Personal link')}><Input readOnly value={renewed.link}/></Field>
      <Button primary onClick={()=>void copyText(renewed.link).then(()=>setDone(t('Link kopiert','Link copied')))}><Copy size={16}/>{t('Link kopieren','Copy link')}</Button>
    </div></Modal>}
  </div>;
}
