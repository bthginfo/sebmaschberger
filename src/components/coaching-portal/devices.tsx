'use client';

import { useEffect, useState } from 'react';
import { Activity as ActivityIcon, Apple, ArrowUpRight, Copy, Download, Dumbbell, Footprints, Link2, Moon, RefreshCw, Scale } from 'lucide-react';
import { readAppleHealth } from '@/lib/coaching-portal/apple';
import { today } from '@/lib/coaching-portal/model';
import type { ClientView, Language, Metrics, Provider } from '@/lib/coaching-portal/model';
import { Button, Empty, Field, Input, Modal, Section, Status, Switch, copyText, errorText, prettyDate, request, translator } from './ui';
import styles from './portal.module.css';

export const deviceNames = { google:'Google Health · Fitbit / Pixel Watch', oura:'Oura Ring', withings:'Withings' } satisfies Record<Provider,string>;
const providerLinks = {
  google:'https://developers.google.com/health/setup',
  oura:'https://developer.ouraring.com/',
  withings:'https://developer.withings.com/developer-guide/v3/integration-guide/public-health-data-api/public-health-data-api-overview/',
} satisfies Record<Provider,string>;
const appleSources = [
  { label:'Garmin Connect', url:'https://support.garmin.com/da-DK/?faq=lK5FPB9iPF5PXFkIpFlFPA&searchType=noProduct' },
  { label:'Polar Flow', url:'https://support.polar.com/en/support/connecting_polar_flow_with_apple_health?category=settings' },
  { label:'WHOOP', url:'https://support.whoop.com/s/article/Apple-Health-Integration?language=en_US' },
];
type Config={provider:Provider;available:boolean;clientId:string;callback:string};
export function DeviceConfig({language}:{language:Language}) {
  const t=translator(language);
  const [data,setData]=useState<Config[]>([]),[issue,setIssue]=useState(''),[done,setDone]=useState('');
  const [busy,setBusy]=useState<Provider|'load'|''>('load');
  const [selected,setSelected]=useState<Provider>('google');
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
      setDone(t('Zugang gespeichert. Teste die Verbindung mit einem Kundenkonto.','Credentials saved. Test the connection with a client account.'));
    }catch(error){setIssue(errorText(error));}finally{setBusy('');}
  }
  async function readGoogleCredentials(file:File,callback:string) {
    setIssue('');setDone('');
    try {
      if(file.size>64_000)throw Error();
      const values=JSON.parse(await file.text())?.web;
      if(typeof values?.client_id!=='string'||typeof values.client_secret!=='string')throw Error();
      setChanges(current=>({...current,google:{id:values.client_id,secret:values.client_secret}}));
      setDone(Array.isArray(values.redirect_uris)&&values.redirect_uris.includes(callback)
        ?t('App-ID und Schlüssel übernommen. Speichere jetzt den Zugang.','App ID and secret imported. Save the credentials to continue.')
        :t('App-ID und Schlüssel übernommen. Ergänze die angezeigte Rücksprungadresse in Google Cloud.','App ID and secret imported. Add the redirect URL shown here in Google Cloud.'));
    }catch{setIssue(t('Wähle die OAuth-JSON-Datei eines Google-Webanwendungsclients.','Choose the OAuth JSON file for a Google web application client.'));}
  }
  const row=data.find(item=>item.provider===selected);
  const value=changes[selected]??{id:row?.clientId??'',secret:''};
  const setupGuide={
    google:t('Aktiviere die Google Health API und lege einen OAuth-Client vom Typ Webanwendung an. Wähle Leserechte für Aktivität und Schlaf. Google kann für den Kundenzugang eine Prüfung verlangen.','Enable the Google Health API and create a web application OAuth client. Select read access to activity and sleep. Google may require verification for client access.'),
    oura:t('Lege im Oura Developer Portal eine Anwendung an. Der Datenzugriff für Oura Ring Gen3 und neuer setzt beim Kunden eine aktive Oura-Mitgliedschaft voraus.','Create an application in the Oura Developer Portal. Customers with an Oura Ring Gen3 or newer need an active Oura membership for data access.'),
    withings:t('Wähle im Withings Partner Hub die Public API und lege eine Anwendung für Aktivitäts- und Schlafdaten an.','Open the Public API in the Withings Partner Hub and create an application for activity and sleep data.'),
  };
  return <div className={styles.stack}>
    <Section title={t('Direkt mit Apple Health starten','Get started with Apple Health')}>
      <div className={styles.stack}>
        <p>{t('Veröffentliche den Kundenplan mit „Fortschritt & Geräte“. Der Kunde importiert seine Datei aus Apple Health selbst. Das geht auch bei Garmin, Polar oder WHOOP, wenn deren Daten in Health sichtbar sind.','Publish the client plan with Progress & devices enabled. The client imports their own file from Apple Health. This also works for Garmin, Polar or WHOOP data already visible in Health.')}</p>
      </div>
    </Section>
    {issue&&<Status bad text={issue}/>} {done&&<Status text={done}/>}
    {data.length>0&&<Section title={t('Anbieter einmal einrichten','Set up a provider once')}>
      <div className={styles.stack}>
        <p className={styles.copy}>{t('Wähle einen Anbieter, den deine Kunden nutzen. Sobald der Zugang gespeichert ist, verbinden sie ihr Konto selbst.','Choose a provider your clients use. After you save the credentials, clients connect their own accounts.')}</p>
        <div className={styles.pills}>{data.map(item=><Button key={item.provider} quiet={selected!==item.provider} primary={selected===item.provider}
          aria-pressed={selected===item.provider} onClick={()=>{setSelected(item.provider);setIssue('');setDone('');}}>{deviceNames[item.provider]}</Button>)}</div>
        {row&&<form className={styles.form} onSubmit={event=>{event.preventDefault();void save(row.provider,value);}}>
          <span className={styles.badge}>{row.available?t('Zugang gespeichert','Credentials saved'):t('Einrichtung offen','Setup pending')}</span>
          <div className={styles.subcard+' '+styles.stack}>
            <h3>{t('1. App beim Anbieter anlegen','1. Create an app with the provider')}</h3><p className={styles.copy}>{setupGuide[row.provider]}</p>
            <div className={styles.actions}><a className={styles.button+' '+styles.quiet} href={providerLinks[row.provider]} target="_blank" rel="noreferrer">{t('Anbieter öffnen','Open provider')}<ArrowUpRight size={15}/></a></div>
          </div>
          <div className={styles.subcard+' '+styles.stack}>
            <h3>{t('2. Rücksprungadresse hinterlegen','2. Add the redirect URL')}</h3>
            <p className={styles.copy}>{t('Füge diese Adresse beim Anbieter unter „Redirect URI“ oder „Callback URL“ ein.','Paste this URL into the provider’s Redirect URI or Callback URL field.')}</p>
            <Field label={t('Rücksprungadresse','Redirect URL')}><Input value={row.callback} readOnly/></Field>
            <div className={styles.actions}><Button quiet onClick={()=>void copyText(row.callback).then(()=>setDone(t('Adresse kopiert','URL copied'))).catch(error=>setIssue(errorText(error)))}><Copy size={15}/>{t('Adresse kopieren','Copy URL')}</Button></div>
          </div>
          <div className={styles.subcard+' '+styles.stack}>
            <h3>{t('3. Zugang hier speichern','3. Save credentials here')}</h3>
            {row.provider==='google'&&<details className={styles.editorItem}><summary>{t('Google-JSON importieren','Import Google JSON')}</summary>
              <p className={styles.copy}>{t('Die Datei aus Google Cloud füllt die beiden Felder aus.','The file from Google Cloud fills both fields.')}</p>
              <Field label={t('OAuth-Datei aus Google Cloud','Google Cloud OAuth file')}><Input type="file" accept=".json,application/json" onChange={event=>{const file=event.target.files?.[0];if(file)void readGoogleCredentials(file,row.callback);}}/></Field>
            </details>}
            <div className={styles.fields}><Field label={t('App-ID (Client ID)','App ID (Client ID)')}><Input required value={value.id} onChange={event=>setChanges({...changes,[row.provider]:{...value,id:event.target.value}})}/></Field>
            <Field label={t('App-Schlüssel (Client Secret)','App secret (Client Secret)')}><Input type="password" autoComplete="new-password" value={value.secret} required={!row.available} onChange={event=>setChanges({...changes,[row.provider]:{...value,secret:event.target.value}})} placeholder={row.available?t('Bei Änderung eingeben','Enter to change'):t('Schlüssel eingeben','Enter secret')}/></Field></div>
            <div className={styles.actions}><Button primary type="submit" loading={busy===row.provider}>{t('Zugang speichern','Save credentials')}</Button></div>
          </div>
        </form>}
      </div>
    </Section>}
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
    if(!staff)void request<{enabled:boolean;lastSync:string|null}>('apple-bridge').then(setBridge).catch(()=>{});
    if(!staff){const device=new URLSearchParams(window.location.search).get('device');if(device==='error')setError('Die Gerätefreigabe konnte nicht abgeschlossen werden.');else if(device)setDone('Gerät verbunden. Du kannst jetzt synchronisieren.');}
  },[staff,current]);
  async function run(label:string,operation:()=>Promise<void>){
    if(busy)return;setBusy(label);setError('');setDone('');
    try{await operation();}catch(reason){setError(errorText(reason));}finally{setBusy('');}
  }
  return <div className={styles.stack}>
    <header className={styles.pageHead}><div><h1>{t('Fortschritt','Progress')}</h1><p>{t('Dein Training und die Werte, die du hier erfassen möchtest.','Your training and the measurements you choose to record here.')}</p></div>
      {!staff&&current&&<Button quiet onClick={()=>setModal('manual')}><ActivityIcon size={16}/>{t('Wert eintragen','Record a value')}</Button>}</header>
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
        {current&&<p className={styles.copy}>{t('Wähle deine Uhr und bestätige zuerst, dass du Werte im Portal speichern möchtest. Für Apple Watch kannst du direkt eine Datei importieren. Bei anderen Geräten führt dich „Verbinden“ zum Anbieter.','Choose your watch and confirm that you want to store measurements in the portal. For Apple Watch, you can import a file directly. For other devices, Connect takes you to the provider.')}</p>}
        {!current&&<p className={styles.copy}>{t('Die Geräteerfassung ist pausiert. Du kannst deine Freigaben und bisherigen Werte hier verwalten.','Device tracking is paused. You can manage your sharing and previous measurements here.')}</p>}
        {(current||client.sharing)&&<Switch label={t('Fortschrittswerte mit meinem Betreuungsteam teilen','Share progress measurements with my coaching team')} checked={client.sharing} change={sharing=>void run('sharing',async()=>{await request('sharing',{sharing});await reload();})}/>}
        {current&&<label className={styles.switch}><span>{t('Ich möchte die ausgewählten Gerätewerte in meinem Coaching-Portal speichern.','I want to store the selected device measurements in my coaching portal.')}</span><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)} style={{opacity:1}}/></label>}
        <div className={styles.subcard+' '+styles.stack}>
          <h3><Apple size={17}/> Apple Watch / Apple Health</h3>
          <p className={styles.copy}>{t('Wähle einen Export aus der Health-App oder richte Health Auto Export auf deinem iPhone ein.','Choose an export from the Health app or set up Health Auto Export on your iPhone.')}</p>
          <div className={styles.actions}>{current&&<><Button quiet disabled={!consent} onClick={()=>{setPreview([]);setModal('apple');}}><Download size={16}/>{t('Health-Export importieren','Import Health export')}</Button>
          <Button quiet loading={busy==='bridge'} disabled={!consent} onClick={()=>void run('bridge',async()=>{setNewToken(await request('apple-bridge',{consent:true}));setBridge(await request('apple-bridge'));})}>
            <Link2 size={16}/>{bridge?.enabled?t('Sync-Schlüssel erneuern','Renew sync key'):t('Automatischen Export einrichten','Set up automatic export')}</Button></>}
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
        {client.devices.filter(device=>current||device.connected||client.metrics.some(row=>row.source===device.provider)).map(device=><div className={styles.subcard+' '+styles.stack} key={device.provider}>
          <header className={styles.panelHeading}><h3>{deviceNames[device.provider]}</h3><span className={styles.badge}>{device.connected?t('Verbunden','Connected'):device.available?t('Verfügbar','Available'):t('Einrichtung offen','Setup pending')}</span></header>
          {device.lastSync&&<small className={styles.copy}>{t('Letzter Abgleich','Last sync')} · {device.lastSync.slice(0,10)}</small>}
          <div className={styles.actions}>{device.connected?<>
            {current&&<Button primary loading={busy===device.provider} onClick={()=>void run(device.provider,async()=>{
              const status=await request<{count:number}>('device-sync',{provider:device.provider});
              await reload();setDone(status.count+' '+t('Tage synchronisiert','days synced'));
            })}><RefreshCw size={16}/>{t('Jetzt synchronisieren','Sync now')}</Button>}
            <Button quiet onClick={()=>{setErase(true);setDeleteProvider(device.provider);}}>{t('Trennen','Disconnect')}</Button>
          </>:<>{current&&<Button quiet disabled={!device.available||!consent} loading={busy===device.provider} onClick={()=>void run(device.provider,async()=>{
            const {url}=await request<{url:string}>('device-start',{provider:device.provider,consent:true});window.location.assign(url);
          })}><Link2 size={16}/>{t('Verbinden','Connect')}</Button>}
          {client.metrics.some(row=>row.source===device.provider)&&<Button quiet onClick={()=>void run('delete-device',async()=>{
            if(window.confirm(t('Importierte Tageswerte dieses Geräts löschen?','Delete this device’s imported measurements?'))){await request('device-disconnect',{provider:device.provider,erase:true});await reload();}
          })}>{t('Importierte Tageswerte löschen','Delete imported daily measurements')}</Button>}</>}</div>
        </div>)}
        <details className={styles.editorItem}><summary>{t('Garmin, Polar, WHOOP und andere Uhren','Garmin, Polar, WHOOP and other watches')}</summary>
          <p>{t('Erlaube deiner Uhren-App, Werte in Apple Health zu schreiben. Sobald sie dort sichtbar sind, kannst du sie mit dem Health-Export übernehmen. Android-Geräte, deren Daten in Google Health erscheinen, kannst du über Google Health verbinden.','Allow your watch app to write data to Apple Health. Once the data appears there, import it using the Health export. Android devices that share data with Google Health can use that connection.')}</p>
          <div className={styles.actions}>{appleSources.map(source=><a key={source.label} className={styles.button+' '+styles.quiet} href={source.url} target="_blank" rel="noreferrer">{source.label}<ArrowUpRight size={14}/></a>)}</div>
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
        <a href="https://support.apple.com/guide/iphone/share-your-health-data-iph5ede58c3d/ios" target="_blank" rel="noreferrer">{t('Apple-Anleitung zum Export','Apple’s export instructions')}</a>
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
