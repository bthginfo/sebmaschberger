'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, CircleHelp, ClipboardList, Dumbbell, Headphones, Link2, Search, Users, Utensils } from 'lucide-react';
import type { ActorView, Language } from '@/lib/coaching-portal/model';
import { Button, Modal, Panel, translator } from './ui';
import styles from './portal.module.css';

type Topic={title:string; icon:typeof Users; flow:string[]; body:string; tab:string};
function topics(language:Language,staff:boolean,owner:boolean):Topic[] {
  const t=translator(language);
  if(!staff)return [
    {title:t('Dein erster Tag','Your first day'),icon:CalendarDays,flow:[t('Heute','Today'),t('Einheit öffnen','Open session'),t('Speichern','Save')],body:t('Öffne deine geplante Einheit. Erledigte Sätze und Aufgaben kannst du direkt markieren.','Open your scheduled session. Check off completed sets and activities as you go.'),tab:'today'},
    {title:t('Rezepte und Kalender','Recipes and calendar'),icon:Utensils,flow:[t('Woche wählen','Choose week'),t('Rezept','Recipe'),t('Einkaufsliste','Shopping list')],body:t('Im Plan passen sich die Mengen an die gewünschte Portionszahl an. Termine kannst du als Kalenderdatei herunterladen.','In your plan, recipe quantities adjust to your servings. Download appointments as calendar files.'),tab:'plan'},
    {title:t('Geräte und Freigabe','Devices and sharing'),icon:Link2,flow:[t('Fortschritt','Progress'),t('Gerät wählen','Choose device'),t('Freigabe','Sharing')],body:t('Wähle Google Health, Oura oder Withings oder importiere Apple Health. Du steuerst, welche Werte dein Betreuungsteam sehen darf.','Connect Google Health, Oura or Withings, or import Apple Health. You decide whether the team can see your measurements.'),tab:'progress'},
    {title:t('Kontakt zum Team','Contact the team'),icon:Headphones,flow:[t('Chat','Chat'),t('Schreiben','Write'),t('Senden','Send')],body:t('Du erreichst Sebastian und dein Betreuungsteam im privaten Chat.','Reach Sebastian and your coaching team in the private chat.'),tab:'chat'},
  ];
  return [
    {title:t('Kunden einladen','Invite clients'),icon:Users,flow:[t('Kunde','Client'),t('Einladen','Invite'),t('Link kopieren','Copy link')],body:t('Erstelle einen Zugang mit Name, E-Mail und Sprache. Der persönliche Link gilt 72 Stunden. Versand und erneute Einladung findest du am Kundenkonto.','Create an account with name, email and language. The personal link lasts 72 hours. Send or renew invitations from the account.'),tab:'people'},
    {title:t('Eine Trainingswoche planen','Plan a training week'),icon:Dumbbell,flow:[t('Vorlage','Template'),t('Übungen','Exercises'),t('Freigeben','Publish')],body:t('Wähle einen Kunden und einen Tag. Ergänze Einheiten, Übungen, Sätze, Pausen und Alternativen. Dupliziere eine Woche und kontrolliere die Handyvorschau vor der Freigabe.','Choose a client and a day. Add sessions, exercises, sets, rest periods and alternatives. Duplicate a week and review the mobile preview before publishing.'),tab:'editor'},
    {title:t('Essenspläne und Rezepte','Meal plans and recipes'),icon:Utensils,flow:[t('Mahlzeit','Meal'),t('Zutaten','Ingredients'),t('Vorlage','Template')],body:t('Mahlzeiten enthalten Zutaten, Portionsgröße und Zubereitung. Speichere sie als Vorlage und schalte Nährwerte gezielt pro Kunde frei.','Meals contain ingredients, serving size and method. Save them as templates and enable nutrition values per client.'),tab:'editor'},
    {title:t('Sichtbarkeit und Medien','Visibility and media'),icon:ClipboardList,flow:[t('Profil','Profile'),t('Sichtbarkeit','Visibility'),t('Kundenvorschau','Client preview')],body:t('Schalte einzelne Bereiche im Planeditor frei und hänge private Bilder, PDFs oder kurze MP4-Videos an. Für längere Videos kannst du einen Anbieterlink hinterlegen. Interne Notizen erscheinen im Kundenprofil des Teams.','Enable plan sections and attach private images, PDFs or short MP4 clips. Use a provider link for longer videos. Internal notes appear in the team view.'),tab:'editor'},
    {title:t('Termine und Check-ins','Appointments and check-ins'),icon:CalendarDays,flow:[t('Tag wählen','Pick a day'),t('Termin oder Fragen','Appointment or questions'),t('Freigeben','Publish')],body:t('Trage einen Termin mit Uhrzeit ein oder erstelle einen Check-in mit Text-, Zahlen- und Skalenfragen. Die Antworten findest du im Verlauf.','Add an appointment with a time or build a check-in with text, number and scale questions. Responses appear in History.'),tab:'editor'},
    {title:t('Persönlich im Chat betreuen','Coach in chat'),icon:Headphones,flow:[t('Kunde','Client'),t('Nachricht','Message'),t('Team-Absender','Team sender')],body:t('Öffne den Kundenchat und antworte mit Text oder Anhang. Kunden sehen Sebastian Coaching. Die interne Ansicht zeigt den Namen des Absenders.','Open a client chat and reply with a message or attachment. Clients see Sebastian Coaching. The team view shows its author.'),tab:'chat'},
    ...(owner?[
      {title:t('Betreuer zuweisen','Assign coaches'),icon:Users,flow:[t('Team','Team'),t('Betreuer','Coach'),t('Kunden zuweisen','Assign clients')],body:t('Betreuer haben eigene Zugänge. Öffne das Kundenprofil, um mehrere Betreuer zuzuweisen oder den Zugang zu pausieren. Änderungen an Freigaben siehst du im Aktivitätsverlauf.','Coaches have individual accounts. Open the client profile to assign multiple coaches or pause access. Review changes in the activity history.'),tab:'people'},
      {title:t('Apple Watch und Fitness-Tracker','Apple Watch and fitness trackers'),icon:Link2,flow:[t('Geräte','Devices'),t('Callback kopieren','Copy callback'),t('Speichern','Save')],body:t('Hinterlege App-Zugangsdaten für Google Health, Oura oder Withings. Kunden geben ihre Werte beim Anbieter frei. Für Apple Watch gibt es Health-Dateiimport und optionalen REST-Sync über Health Auto Export.','Enter app credentials for Google Health, Oura or Withings. Clients authorize their data at the provider. Apple Watch supports Health file import and optional REST sync via Health Auto Export.'),tab:'devices'},
      {title:t('Google Ads übernehmen','Prepare Google Ads'),icon:Search,flow:[t('Kampagne','Campaign'),t('Freigeben','Approve'),t('Kopieren','Copy')],body:t('Prüfe Keywords und Anzeigen pro Anzeigengruppe. Kopiere einzelne Textfelder oder lade die CSV-Dateien für Google Ads Editor herunter.','Review keywords and ads by ad group. Copy individual fields or download the CSV files for Google Ads Editor.'),tab:'ads'},
    ]:[]),
  ];
}
export function PortalHelp({ actor,language,open }: {actor:ActorView;language:Language;open:(tab:string)=>void}) {
  const t=translator(language), rows=topics(language,actor.role!=='client',actor.role==='owner');
  return <><header className={styles.pageHead}><div><h1>{t('Hilfe zum Coaching','Coaching help')}</h1><p>{t('Die wichtigsten Aufgaben zum Nachmachen.','Step-by-step guidance for everyday tasks.')}</p></div><CircleHelp size={31}/></header>
    <div className={styles.grid}>{rows.map(row=><Panel key={row.title}><div className={styles.stack}>
      <div className={styles.guide}><row.icon size={21}/><div className={styles.pills}>{row.flow.map(step=><span className={styles.badge} key={step}>{step}</span>)}</div></div>
      <h2>{row.title}</h2><p className={styles.copy}>{row.body}</p>
      <Button quiet onClick={()=>open(row.tab)}>{t('Bereich öffnen','Open section')}<ArrowRight size={16}/></Button>
    </div></Panel>)}</div></>;
}
export function PortalTour({actor,language,force,close}: {actor:ActorView;language:Language;force:boolean;close:()=>void}) {
  const t=translator(language);
  const [show,setShow]=useState(false),[index,setIndex]=useState(0);
  const key='coaching-intro-v1-'+actor.id;
  useEffect(()=>{
    if(force){setIndex(0);setShow(true);return;}
    if(actor.role!=='client'&&localStorage.getItem(key)!=='done'){setIndex(0);setShow(true);}
  },[force,key,actor.role]);
  if(!show)return null;
  const rows=topics(language,actor.role!=='client',actor.role==='owner'), row=rows[index];
  function end(){localStorage.setItem(key,'done');setShow(false);close();}
  return <Modal title={t('Einführung ins Coaching-Portal','Coaching portal introduction')} close={end}>
    <div className={styles.stack}><small className={styles.label}>{index+1} / {rows.length}</small>
      <div className={styles.guide}><row.icon size={23}/><div className={styles.pills}>{row.flow.map(label=><span key={label} className={styles.badge}>{label}</span>)}</div></div>
      <h3>{row.title}</h3><p className={styles.copy}>{row.body}</p>
      <div className={styles.actionsRight}><Button quiet onClick={end}>{t('Später','Later')}</Button>
        {index>0&&<Button quiet onClick={()=>setIndex(index-1)}>{t('Zurück','Back')}</Button>}
        <Button primary onClick={()=>index+1===rows.length?end():setIndex(index+1)}>{index+1===rows.length?t('Fertig','Done'):t('Weiter','Next')}<ArrowRight size={17}/></Button></div>
    </div>
  </Modal>;
}
