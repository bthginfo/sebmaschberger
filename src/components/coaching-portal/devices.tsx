'use client';

import { useEffect, useState } from 'react';
import { Activity as ActivityIcon, Apple, Copy, Download, Dumbbell, Footprints, Link2, Moon, RefreshCw, Scale } from 'lucide-react';
import { readAppleHealth } from '@/lib/coaching-portal/apple';
import { today } from '@/lib/coaching-portal/model';
import type { ClientView, Language, Metrics, Provider } from '@/lib/coaching-portal/model';
import { Button, Empty, Field, Input, Modal, Section, Status, Switch, copyText, errorText, prettyDate, request, translator } from './ui';
import styles from './portal.module.css';

export const deviceNames = { google:'Google Health · Fitbit / Pixel Watch', oura:'Oura Ring', withings:'Withings' } satisfies Record<Provider,string>;
type Config={provider:Provider;available:boolean;clientId:string;callback:string};
export function DeviceConfig({language}:{language:Language}) {
  const t=translator(language);
  const [data,setData]=useState<Config[]>([]),[issue,setIssue]=useState(''),[done,setDone]=useState('');
  const [busy,setBusy]=useState<Provider|'load'|''>('load');
  const [changes,setChanges]=useState<Partial<Record<Provider,{id:string;secret:string}>>>({});
  async function reload() {
    const items=await request<Config[]>('device-config');
    setData(items);
  }
  useEffect(()=>{void reload().catch(error=>setIssue(errorText(error))).finally(()=>setBusy(''));},[]);
  async function save(provider:Provider,value:{id:string;secret:string}) {
    setBusy(provider);setIssue('');setDone('');
    try{
      await request('device-config',{provider,...value});
      await reload();
      setChanges(current=>({...current,[provider]:undefined}));
      setDone(t('Schnittstelle gespeichert','Connection settings saved'));
    }catch(error){setIssue(errorText(error));}finally{setBusy('');}
  }
  return <div className={styles.stack}>
    {issue&&<Status bad text={issue}/>} {done&&<Status text={done}/>}
    {data.map(row=>{
      const value=changes[row.provider]??{id:row.clientId,secret:''};
      return <Section title={deviceNames[row.provider]} key={row.provider}
        action={<span className={styles.badge}>{row.available?t('Eingerichtet','Configured'):t('Einrichtung offen','Setup pending')}</span>}>
        <form className={styles.form} onSubmit={event=>{event.preventDefault();void save(row.provider,value);}}>
          <Field label="Callback URL"><Input value={row.callback} readOnly/></Field>
          <Button quiet onClick={()=>void copyText(row.callback).then(()=>setDone(t('Adresse kopiert','URL copied'))).catch(error=>setIssue(errorText(error)))}><Copy size={15}/>{t('Adresse kopieren','Copy URL')}</Button>
          <div className={styles.fields}><Field label="Client ID"><Input required value={value.id} onChange={event=>setChanges({...changes,[row.provider]:{...value,id:event.target.value}})}/></Field>
          <Field label="Client Secret"><Input type="password" autoComplete="new-password" value={value.secret} onChange={event=>setChanges({...changes,[row.provider]:{...value,secret:event.target.value}})} placeholder={row.available?t('Bei Änderung eingeben','Enter to change'):t('Schlüssel eingeben','Enter secret')}/></Field></div>
          <Button primary type="submit" loading={busy===row.provider}>{t('Schnittstelle speichern','Save connection settings')}</Button>
        </form>
      </Section>;
    })}
    {busy==='load'&&<p role="status">{t('Lade Schnittstellen …','Loading integrations…')}</p>}
  </div>;
}
const sourceTitles={manual:'Manuell',apple:'Apple Health',google:'Google Health',oura:'Oura',withings:'Withings'};
function extractTop(rows:ClientView['metrics']) {
  const days=new Map<string,{date:string;steps?:number;sleep?:number}>();
  for (const row of [...rows].sort((a,b)=>a.source==='manual'?1:b.source==='manual'?-1:0)) {
    days.set(row.date,{...days.get(row.date),...row});
  }
  return [...days.values()].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,7);
}
export function Progress({client,language,reload,staff=false}:{client:ClientView;language:Language;reload:()=>Promise<void>;staff?:boolean}) {
  const t=translator(language);
  const [modal,setModal]=useState<'manual'|'apple'|null>(null),[consent,setConsent]=useState(false),[busy,setBusy]=useState(''),[error,setError]=useState(''),[done,setDone]=useState('');
  const [preview,setPreview]=useState<Metrics[]>([]),[newToken,setNewToken]=useState<{token:string;link:string}|null>(null);
  const [bridge,setBridge]=useState<{enabled:boolean;lastSync:string|null}|null>(null);
  const [deleteProvider,setDeleteProvider]=useState<Provider|null>(null),[erase,setErase]=useState(true);
  const current=client.program.published?.plan.features.tracking;
  const days=extractTop(client.metrics), maxSteps=Math.max(1,client.program.profile.steps??0,...days.map(day=>day.steps??0));
  useEffect(()=>{
    if(!staff&&current)void request<{enabled:boolean;lastSync:string|null}>('apple-bridge').then(setBridge).catch(()=>{});
    if(!staff){const device=new URLSearchParams(window.location.search).get('device');if(device==='error')setError('Die Gerätefreigabe konnte nicht abgeschlossen werden.');else if(device)setDone('Gerät verbunden. Du kannst jetzt synchronisieren.');}
  },[staff,current]);
  async function run(label:string,operation:()=>Promise<void>){
    if(busy)return;setBusy(label);setError('');setDone('');
    try{await operation();}catch(reason){setError(errorText(reason));}finally{setBusy('');}
  }
  if(!current&&!staff)return <Section title={t('Fortschritt','Progress')}><Empty title={t('Dieser Bereich wird vom Team freigegeben','Your team enables this space')}/></Section>;
  return <div className={styles.stack}>
    <header className={styles.pageHead}><div><h1>{t('Fortschritt','Progress')}</h1><p>{t('Dein Training und die Werte, die du hier erfassen möchtest.','Your training and the measurements you choose to record here.')}</p></div>
      {!staff&&<Button quiet onClick={()=>setModal('manual')}><ActivityIcon size={16}/>{t('Wert eintragen','Record a value')}</Button>}</header>
    {error&&<Status bad text={error}/>} {done&&<Status text={done}/>}
    <div className={styles.statGrid}>
      <div className={styles.stat}><Dumbbell size={16}/><b>{client.logs.filter(log=>log.kind==='workout'&&log.done).length}</b><span>{t('Trainings erfasst','Workouts logged')}</span></div>
      <div className={styles.stat}><Footprints size={16}/><b>{days.find(v=>typeof v.steps==='number')?.steps?.toLocaleString(language)??'–'}</b><span>{t('Neuester Schrittwert','Latest step count')}</span></div>
      <div className={styles.stat}><Moon size={16}/><b>{days.find(v=>typeof v.sleep==='number')?.sleep!==undefined?(days.find(v=>typeof v.sleep==='number')!.sleep!/60).toFixed(1)+' h':'–'}</b><span>{t('Neuester Schlafwert','Latest sleep')}</span></div>
    </div>
    <Section title={t('Letzte Schritte','Recent steps')}>
      {days.some(day=>day.steps!==undefined)?<div className={styles.trends}>{days.filter(day=>day.steps!==undefined).map(day=><div className={styles.trend} key={day.date}>
        <span>{prettyDate(day.date,language)}</span><span className={styles.rail} aria-hidden="true"><i style={{width:String((day.steps??0)/maxSteps*100)+'%'}}/></span><strong>{day.steps?.toLocaleString(language)}</strong>
      </div>)}</div>:<Empty title={staff&&!client.sharing?t('Der Kunde entscheidet über die Gerätefreigabe','The client controls device-data sharing'):t('Hier erscheinen deine ersten Werte','Your first measurements will appear here')}/>}
    </Section>
    <Section title={t('Verlauf','History')}>
      <div className={styles.stack}>{client.logs.slice(0,32).map(log=><div className={styles.subcard} key={log.id}><strong>{log.title}</strong>
        <p className={styles.copy}>{log.date} · {log.done?t('Erledigt','Complete'):t('Begonnen','In progress')}</p>
        {log.comment&&<p>{log.comment}</p>}{Object.entries(log.answers).map(([key,value])=>{
          const edition=[client.program.published,...client.program.history].find(edition=>edition?.id===log.edition);
          const name=edition?.plan.items.find(item=>item.id===log.item)?.questions.find(question=>question.id===key)?.label;
          return name?<p key={key}>{name} · {typeof value==='boolean'?(value?t('Ja','Yes'):t('Nein','No')):value}</p>:null;
        })}</div>)}</div>
      {!client.logs.length&&<Empty title={t('Deine Aktivitäten erscheinen hier','Your activities will appear here')}/>}
    </Section>
    {!staff&&<Section title={t('Tracker und Apple Watch','Trackers and Apple Watch')}>
      <div className={styles.stack}>
        <Switch label={t('Fortschrittswerte mit meinem Betreuungsteam teilen','Share progress measurements with my coaching team')} checked={client.sharing} change={sharing=>void run('sharing',async()=>{await request('sharing',{sharing});await reload();})}/>
        <label className={styles.switch}><span>{t('Ich möchte die ausgewählten Gerätewerte in meinem Coaching-Portal speichern.','I want to store the selected device measurements in my coaching portal.')}</span><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)} style={{opacity:1}}/></label>
        <div className={styles.subcard+' '+styles.stack}>
          <h3><Apple size={17}/> Apple Watch / Apple Health</h3>
          <p className={styles.copy}>{t('Wähle einen Export aus der Health-App oder richte Health Auto Export auf deinem iPhone ein.','Choose an export from the Health app or set up Health Auto Export on your iPhone.')}</p>
          <div className={styles.actions}><Button quiet disabled={!consent} onClick={()=>{setPreview([]);setModal('apple');}}><Download size={16}/>{t('Health-Export importieren','Import Health export')}</Button>
          <Button quiet loading={busy==='bridge'} disabled={!consent} onClick={()=>void run('bridge',async()=>{setNewToken(await request('apple-bridge',{consent:true}));setBridge(await request('apple-bridge'));})}>
            <Link2 size={16}/>{bridge?.enabled?t('Sync-Schlüssel erneuern','Renew sync key'):t('Automatischen Export einrichten','Set up automatic export')}</Button>
          {bridge?.enabled&&<Button quiet onClick={()=>void run('revoke',async()=>{await request('apple-revoke',{});setNewToken(null);setBridge(null);})}>{t('Automatischen Export trennen','Disconnect automatic export')}</Button>}</div>
          {bridge?.lastSync&&<small className={styles.copy}>{t('Letzter Import','Last import')} · {bridge.lastSync.slice(0,10)}</small>}
          {newToken&&<div className={styles.form}><p>{t('Füge in Health Auto Export eine REST-Automation mit täglichen Schritt- und Schlafwerten hinzu. Verwende JSON und trage diese URL und den Header ein.','In Health Auto Export add a REST automation with daily steps and sleep, choose JSON, and enter this URL and header.')}</p>
            <Field label="Endpoint"><Input readOnly value={newToken.link}/></Field><Field label="Authorization"><Input readOnly value={'Bearer '+newToken.token}/></Field>
            <div className={styles.actions}><Button quiet onClick={()=>void copyText(newToken.link)}>{t('URL kopieren','Copy URL')}</Button><Button quiet onClick={()=>void copyText('Bearer '+newToken.token)}>{t('Header kopieren','Copy header')}</Button></div>
          </div>}
          {client.metrics.some(row=>row.source==='apple')&&<Button quiet onClick={()=>void run('delete-apple',async()=>{
            if(window.confirm(t('Alle importierten Apple-Health-Werte löschen?','Delete imported Apple Health data?'))){await request('apple-delete',{});await reload();}
          })}>{t('Apple-Health-Werte löschen','Delete Apple Health values')}</Button>}
        </div>
        {client.devices.map(device=><div className={styles.subcard+' '+styles.stack} key={device.provider}>
          <header className={styles.panelHeading}><h3>{deviceNames[device.provider]}</h3><span className={styles.badge}>{device.connected?t('Verbunden','Connected'):device.available?t('Verfügbar','Available'):t('Einrichtung offen','Setup pending')}</span></header>
          {device.lastSync&&<small className={styles.copy}>{t('Letzter Abgleich','Last sync')} · {device.lastSync.slice(0,10)}</small>}
          <div className={styles.actions}>{device.connected?<>
            <Button primary loading={busy===device.provider} onClick={()=>void run(device.provider,async()=>{
              const status=await request<{count:number}>('device-sync',{provider:device.provider});
              await reload();setDone(status.count+' '+t('Tage synchronisiert','days synced'));
            })}><RefreshCw size={16}/>{t('Jetzt synchronisieren','Sync now')}</Button>
            <Button quiet onClick={()=>{setErase(true);setDeleteProvider(device.provider);}}>{t('Trennen','Disconnect')}</Button>
          </>:<Button quiet disabled={!device.available||!consent} loading={busy===device.provider} onClick={()=>void run(device.provider,async()=>{
            const {url}=await request<{url:string}>('device-start',{provider:device.provider,consent:true});window.location.assign(url);
          })}><Link2 size={16}/>{t('Verbinden','Connect')}</Button>}</div>
        </div>)}
        <details className={styles.editorItem}><summary>{t('Garmin, Polar, WHOOP und andere Uhren','Garmin, Polar, WHOOP and other watches')}</summary>
          <p>{t('Wenn dein Anbieter Schritte oder Schlaf mit Apple Health synchronisiert, kannst du diese über den Health-Export übernehmen. Android-Geräte mit Google-Health-Synchronisierung verbindest du über Google Health. Direkte Herstelleranbindungen haben eigene Freigaben.','If your device sends steps or sleep to Apple Health, use the Health export. Android devices that sync to Google Health can use that connection. Vendors have separate direct API approvals.')}</p>
        </details>
        <a className={styles.button+' '+styles.quiet} href="/api/coaching-portal/export"><Download size={16}/>{t('Meine Coaching-Daten exportieren','Export my coaching data')}</a>
      </div>
    </Section>}
    {modal==='manual'&&<Modal title={t('Fortschritt eintragen','Record progress')} close={()=>setModal(null)}>
      <form className={styles.form} onSubmit={event=>{
        event.preventDefault();const form=new FormData(event.currentTarget),values:Metrics={date:String(form.get('date'))};
        for(const key of ['steps','sleep','weight','active'] as const){const field=form.get(key);if(field)values[key]=Number(field);}
        void run('manual',async()=>{await request('metrics',values);await reload();setModal(null);setDone(t('Werte gespeichert','Values saved'));});
      }}><Field label={t('Datum','Date')}><Input type="date" name="date" defaultValue={today()} required/></Field>
      <div className={styles.fields}>
      <Field label={t('Schritte','Steps')}><Input type="number" min={0} name="steps"/></Field>
      <Field label={t('Schlaf in Minuten','Sleep in minutes')}><Input type="number" min={0} name="sleep"/></Field>
      <Field label={t('Bewegungsminuten','Active minutes')}><Input type="number" min={0} name="active"/></Field>
      <Field label={t('Gewicht in kg','Weight in kg')}><Input type="number" min={20} step=".1" name="weight"/></Field>
      </div>{error&&<Status bad text={error}/>}<Button primary type="submit" loading={busy==='manual'}><Scale size={16}/>{t('Speichern','Save')}</Button></form>
    </Modal>}
    {modal==='apple'&&<Modal title={t('Apple-Health-Export','Apple Health export')} close={()=>setModal(null)}>
      <div className={styles.stack}><p>{t('Öffne auf dem iPhone Health, dein Profil und „Alle Gesundheitsdaten exportieren“. Wähle die ZIP- oder XML-Datei. Das Portal extrahiert auf deinem Gerät die letzten 90 Tage mit Schritten, Schlaf, Workouts und Gewicht.','In iPhone Health, open your profile and Export All Health Data. Select the ZIP or XML file. Your device extracts up to 90 days of steps, sleep, workouts and weight.')}</p>
        <Field label={t('Exportdatei','Export file')}><Input type="file" accept=".zip,.xml" onChange={event=>{
          const file=event.target.files?.[0];if(file)void run('read',async()=>{setPreview(await readAppleHealth(file));});
        }}/></Field>
        {preview.length>0&&<p className={styles.copy}>{preview.length} {t('Tage zum Import bereit.','days ready to import.')}</p>}
        {error&&<Status bad text={error}/>}
        <Button primary disabled={!preview.length||!consent} loading={busy==='import'} onClick={()=>void run('import',async()=>{
          await request('apple-import',{consent:true,rows:preview});await reload();setModal(null);setDone(t('Apple-Health-Werte importiert','Apple Health values imported'));
        })}>{t('Tageswerte übernehmen','Import daily measurements')}</Button>
      </div>
    </Modal>}
    {deleteProvider&&<Modal title={t('Gerät trennen','Disconnect device')} close={()=>setDeleteProvider(null)}>
      <div className={styles.stack}><Switch label={t('Importierte Tageswerte löschen','Delete imported daily measurements')} checked={erase} change={setErase}/>
      {error&&<Status bad text={error}/>}<Button primary loading={busy==='disconnect'} onClick={()=>void run('disconnect',async()=>{await request('device-disconnect',{provider:deleteProvider,erase});setDeleteProvider(null);await reload();})}>{t('Verbindung trennen','Disconnect')}</Button></div>
    </Modal>}
  </div>;
}
