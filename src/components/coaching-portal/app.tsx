'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity as Pulse, ArrowRight, CalendarDays, CircleHelp, ClipboardList, Home, Layers, LogOut, MessageCircle, Moon, Smartphone, Sun, Users } from 'lucide-react';
import type { Activity, ActorView, Language, PortalSnapshot } from '@/lib/coaching-portal/model';
import { ClientPlan } from './client-plan';
import { CoachWorkspace } from './coach';
import { Chat } from './chat';
import { Progress } from './devices';
import { PortalHelp, PortalTour } from './help';
import { Button, Field, Input, Status, errorText, request, translator } from './ui';
import styles from './portal.module.css';

const clientTabs=[
  ['today','Heute','Today',Home],['plan','Mein Plan','My plan',ClipboardList],['calendar','Kalender','Calendar',CalendarDays],
  ['chat','Chat','Chat',MessageCircle],['progress','Fortschritt','Progress',Pulse],['help','Hilfe','Help',CircleHelp]
] as const;
const coachTabs=[
  ['people','Kunden','Clients',Users],['editor','Planeditor','Plan editor',ClipboardList],['calendar','Kalender','Calendar',CalendarDays],
  ['chat','Chat','Chat',MessageCircle],['progress','Verlauf','History',Pulse],['library','Bibliothek','Library',Layers],
  ['devices','Geräte','Devices',Smartphone],['help','Hilfe','Help',CircleHelp]
] as const;

function Login({language,configured}:{language:Language;configured:boolean}) {
  const t=translator(language);
  const [invitation,setInvitation]=useState<string[]|null>(null),[busy,setBusy]=useState(false),[issue,setIssue]=useState('');
  useEffect(()=>{
    const value=window.location.hash.match(/^#invite=([a-f0-9]{64})\.([a-zA-Z0-9_-]{43})$/u);
    if(value)setInvitation(value.slice(1));
  },[]);
  return <main className={styles.login}>
    <div className={styles.loginCopy}><span className={styles.label}>{t('Online-Coaching','Online coaching')}</span>
      <h1>{invitation?t('Dein Zugang steht bereit.','Your account is ready.'):t('Deine Woche. Dein Tempo.','Your week. Your pace.')}</h1>
      <p>{invitation?t('Wähle ein Passwort für deinen persönlichen Zugang.','Choose a password for your personal account.'):
        t('Deine Pläne, dein Fortschritt und dein Coaching-Team an einem Ort.','Your plans, your progress and your coaching team in one place.')}</p>
      <form className={styles.form} onSubmit={event=>{
        event.preventDefault();setBusy(true);setIssue('');
        const values=new FormData(event.currentTarget), password=values.get('password');
        const action=invitation?'accept':'login', payload=invitation?{id:invitation[0],token:invitation[1],password}:{email:values.get('email'),password};
        void request(action,payload).then(()=>window.location.replace('/portal')).catch(error=>setIssue(errorText(error))).finally(()=>setBusy(false));
      }}>
        {!invitation&&<Field label="E-Mail"><Input type="email" name="email" required autoComplete="username"/></Field>}
        <Field label={t('Passwort','Password')}><Input type="password" name="password" required minLength={invitation?12:1} maxLength={128}
          autoComplete={invitation?'new-password':'current-password'}/></Field>
        {invitation&&<small className={styles.copy}>{t('Mindestens zwölf Zeichen.','At least twelve characters.')}</small>}
        {issue&&<Status bad text={issue}/>}
        {!configured&&<Status bad text={t('Der Zugang wird gerade eingerichtet.','Account access is being set up.')}/>}
        <Button primary type="submit" loading={busy} disabled={!configured}><ArrowRight size={17}/>{invitation?t('Zugang aktivieren','Activate account'):t('Anmelden','Sign in')}</Button>
      </form>
      <div className={styles.loginMeta}><a href="/admin/coaching">{t('Sebastians Arbeitsbereich','Sebastian’s workspace')}</a><a href={language==='en'?'/en/contact':'/kontakt'}>{t('Kontakt','Contact')}</a></div>
    </div>
    <img src="/media/project/studio-portrait.webp" alt="Sebastian Maschberger"/>
  </main>;
}

export function PortalApp({ actor, configured }: { actor: ActorView | null; configured: boolean }) {
  const [language,setLanguage]=useState<Language>(actor?.language??'de'),[light,setLight]=useState(false);
  const [tab,setTab]=useState(actor?.role==='client'?'today':'people'),[selection,setSelection]=useState('');
  const [snapshot,setSnapshot]=useState<PortalSnapshot|null>(null),[issue,setIssue]=useState(''),[tour,setTour]=useState(false);
  const t=translator(language);
  const role=actor?.role, staff=Boolean(role&&role!=='client');
  const tabs=staff?coachTabs.filter(item=>item[0]!=='devices'||role==='owner'):clientTabs;
  useEffect(()=>{
    const value=localStorage.getItem('seb-portal-language');
    if(value==='de'||value==='en')setLanguage(value);
    setLight(localStorage.getItem('seb-color-mode')==='light');
    const params=new URLSearchParams(window.location.search), requested=params.get('tab');
    if(requested&&['people','editor','calendar','chat','progress','library','devices','help','today','plan'].includes(requested))setTab(requested);
    if(params.has('device')&&role==='client')setTab('progress');
  },[role]);
  const refresh=useCallback(async()=>{
    if(!actor||!configured)return;
    const param=selection?'?client='+encodeURIComponent(selection):'';
    const value=await request<PortalSnapshot>('state'+param);
    setSnapshot(value);setIssue('');
  },[actor,configured,selection]);
  useEffect(()=>{
    void refresh().catch(error=>setIssue(errorText(error)));
  },[refresh]);
  function navigate(value:string){
    if(value==='ads'){window.location.assign('/admin/google-ads');return;}
    setTab(value);
    window.scrollTo({top:0,behavior:'instant'});
  }
  function addLog(value:Activity){
    setSnapshot(current=>current?.client?{...current,client:{...current.client,logs:[value,...current.client.logs.filter(item=>item.id!==value.id)]}}:current);
  }
  const openTabs=<>{tabs.map(([id,de,en,Icon])=><button key={id} type="button" aria-current={tab===id?'page':undefined} onClick={()=>navigate(id)}><Icon size={18} aria-hidden="true"/>{t(de,en)}</button>)}</>;
  const current=snapshot?.client;
  return <div className={styles.root} lang={language} data-mode={light?'light':'dark'}>
    <header className={styles.header}><div className={styles.headerInner}>
      <a href={language==='en'?'/en':'/de'} className={styles.brand}><img alt="" src="/media/project/sebastian-logo.svg"/><span>Sebastian Coaching<small>{staff?t('Arbeitsbereich','Workspace'):t('Kundenportal','Client portal')}</small></span></a>
      <div className={styles.controls}>
        <Button quiet aria-label={t('Sprache wechseln','Change language')} onClick={()=>{const next=language==='de'?'en':'de';setLanguage(next);localStorage.setItem('seb-portal-language',next);}}>{language==='de'?'EN':'DE'}</Button>
        <Button quiet aria-label={light?t('Dunkle Ansicht','Dark appearance'):t('Helle Ansicht','Light appearance')} onClick={()=>{setLight(!light);localStorage.setItem('seb-color-mode',light?'dark':'light');}}>{light?<Moon size={18}/>:<Sun size={18}/>}</Button>
        {actor&&<Button quiet aria-label={t('Einführung öffnen','Open introduction')} onClick={()=>setTour(true)}><CircleHelp size={18}/></Button>}
        {actor&&actor.role!=='owner'&&<Button quiet aria-label={t('Abmelden','Sign out')} onClick={()=>void request('logout',{}).then(()=>window.location.assign('/portal')).catch(error=>setIssue(errorText(error)))}><LogOut size={17}/></Button>}
        {actor?.role==='owner'&&<a href="/admin" className={styles.button+' '+styles.quiet}>CMS</a>}
      </div>
    </div></header>
    {!actor?<Login language={language} configured={configured}/>:<>
      <div className={styles.workspace}>
        <aside className={styles.sidebar}><nav aria-label={t('Coaching-Bereiche','Coaching sections')}>{openTabs}</nav></aside>
        <main className={styles.main}>
          {issue&&<Status bad text={issue}/>}
          {!configured&&<Status bad text={t('Das Portal wartet auf seine Datenbankverbindung.','The portal is waiting for its database connection.')}/>}
          {!snapshot&&!issue&&configured&&<p role="status">{t('Coaching wird geladen …','Loading coaching…')}</p>}
          {snapshot&&staff&&<CoachWorkspace snapshot={snapshot} language={language} tab={tab} open={navigate} selection={setSelection} reload={refresh}/>}
          {snapshot&&current&&!staff&&<>
            {(tab==='today'||tab==='plan'||tab==='calendar')&&<ClientPlan key={tab} client={current} language={language} view={tab} onLog={addLog}/>}
            {tab==='chat'&&<Chat actor={actor} client={current} language={language}/>}
            {tab==='progress'&&<Progress client={current} language={language} reload={refresh}/>}
            {tab==='help'&&<PortalHelp actor={actor} language={language} open={navigate}/>}
          </>}
        </main>
      </div>
      <nav className={styles.mobileNav} aria-label={t('Coaching-Bereiche','Coaching sections')}>{openTabs}</nav>
      {snapshot&&<PortalTour actor={actor} language={language} force={tour} close={()=>setTour(false)}/>}
    </>}
  </div>;
}
