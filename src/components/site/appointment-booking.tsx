"use client";

import {useEffect,useState,type FormEvent} from 'react';
import {ArrowRight,CalendarDays,CheckCircle2,Clock3} from 'lucide-react';
import {appointmentText,appointmentZone,type AppointmentSlot,type AppointmentDelivery} from '@/lib/consultations/model';
import type {SiteLanguage} from '@/lib/types';
import styles from './appointment-booking.module.css';

type Confirmation={slot:AppointmentSlot;name:string;link:string;delivery:AppointmentDelivery};
type BookingView={name:string;slot:AppointmentSlot;status:'confirmed'|'cancelled';canChange:boolean;version:number;options:AppointmentSlot[]};

async function post<T>(path:string,data:Record<string,unknown>,language:SiteLanguage) {
  const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const body=await response.json();
  if(!response.ok)throw new Error(language==='de'&&body.error?body.error:
    (response.status===409?'That time is no longer available. Please choose another.':'The request could not be completed. Please try again.'));
  return body as T;
}
function dayKey(value:string) {
  return new Intl.DateTimeFormat('en-CA',{timeZone:appointmentZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
}
function dayLabel(value:string,language:SiteLanguage) {
  const locale=language==='en'?'en-GB':'de-DE';
  return new Intl.DateTimeFormat(locale,{timeZone:appointmentZone,weekday:'short',day:'numeric',month:'short'}).format(new Date(value));
}
function ics(slot:AppointmentSlot) {
  const stamp=(value:string|number)=>new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/u,'Z');
  const text=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Website Starter//Appointment//EN','BEGIN:VEVENT','UID:'+slot.id+'@website',
    'DTSTAMP:'+stamp(Date.now()),'DTSTART:'+stamp(slot.start),'DTEND:'+stamp(Date.parse(slot.start)+slot.minutes*60000),
    'SUMMARY:Appointment','END:VEVENT','END:VCALENDAR'].join('\r\n');
  return 'data:text/calendar;charset=utf-8,'+encodeURIComponent(text);
}

function TimeChoices({slots,selected,onSelect,language}:{slots:AppointmentSlot[];selected:string;onSelect:(id:string)=>void;language:SiteLanguage}) {
  const [day,setDay]=useState('');
  const days=[...new Map(slots.map(slot=>[dayKey(slot.start),slot])).entries()];
  const active=days.some(([key])=>key===day)?day:days[0]?.[0];
  const english=language==='en';
  return <>
    <div className={styles.choices} role="group" aria-label={english?'Available days':'Freie Tage'}>
      {days.map(([key,slot])=><button key={key} type="button" aria-pressed={key===active} onClick={()=>{setDay(key);onSelect('');}}>{dayLabel(slot.start,language)}</button>)}
    </div>
    <div className={styles.choices} role="group" aria-label={english?'Available times':'Freie Uhrzeiten'}>
      {slots.filter(slot=>dayKey(slot.start)===active).map(slot=><button type="button" key={slot.id} aria-pressed={slot.id===selected}
        onClick={()=>onSelect(slot.id)}><Clock3 size={15} aria-hidden="true"/>{new Intl.DateTimeFormat(english?'en-GB':'de-DE',{timeZone:appointmentZone,hour:'2-digit',minute:'2-digit'}).format(new Date(slot.start))} · {slot.minutes} min</button>)}
    </div>
  </>;
}

export function AppointmentBooking({language}:{language:SiteLanguage}) {
  const english=language==='en', t=(de:string,en:string)=>english?en:de;
  const [slots,setSlots]=useState<AppointmentSlot[]>([]);
  const [loading,setLoading]=useState(true),[selected,setSelected]=useState(''),[busy,setBusy]=useState(false);
  const [error,setError]=useState(''),[unavailable,setUnavailable]=useState(false),[result,setResult]=useState<Confirmation>();
  const [preview,setPreview]=useState<AppointmentSlot>();
  const [reload,setReload]=useState(0);
  const selectedSlot=slots.find(slot=>slot.id===selected);
  const sample=selectedSlot?.sample===true;
  const previewOnly=slots.some(slot=>slot.sample);
  useEffect(()=>{
    const controller=new AbortController();
    setLoading(true);setUnavailable(false);
    fetch('/api/consultations',{signal:controller.signal,cache:'no-store'})
      .then(async response=>{if(!response.ok)throw Error();setSlots((await response.json()).slots);})
      .catch(()=>{if(!controller.signal.aborted)setUnavailable(true);})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[reload]);
  async function book(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(busy||!selectedSlot)return;
    if(selectedSlot.sample){setPreview(selectedSlot);return;}
    const form=new FormData(event.currentTarget);
    setBusy(true);setError('');
    try{
      const saved=await post<Confirmation>('/api/consultations',{slotId:selected,name:form.get('name'),email:form.get('email'),
        consent:form.get('consent')==='on',website:form.get('website'),language},language);
      setResult(saved);
    }catch(reason){setError(reason instanceof Error?reason.message:t('Bitte versuche es erneut.','Please try again.'));}
    finally{setBusy(false);}
  }
  return <section className={styles.booking} aria-label={t('Erstgespräch buchen','Book an intro call')}>
    <div className={styles.heading}><CalendarDays size={26} aria-hidden="true"/><div><h3>{t('Such dir einen Termin aus.','Choose a time.')}</h3><p>{t('Die Uhrzeiten sind in der Zeitzone Berlin angegeben.','Times are shown in Berlin time.')}</p></div></div>
    {result?<div role="status" className={styles.confirmed}>
      <CheckCircle2 size={25} aria-hidden="true"/><h4>{t('Dein Termin steht.','Your appointment is booked.')}</h4>
      <p>{appointmentText(result.slot,language)} · {result.slot.minutes} min</p>
      <p>{result.delivery==='sent'?t('Ich habe dir eine Bestätigung per E-Mail geschickt.','I’ve sent you a confirmation email.'):
        t('Speichere deinen Terminlink. Darüber kannst du umbuchen oder absagen.','Save your appointment link to reschedule or cancel.')}</p>
      <div className={styles.actions}><a href={result.link}>{t('Termin verwalten','Manage appointment')}</a><a href={ics(result.slot)} download="termin.ics">{t('Zum Kalender hinzufügen','Add to calendar')}</a></div>
    </div>:preview?<div role="status" className={styles.confirmed}>
      <CheckCircle2 size={25} aria-hidden="true"/><h4>{t('So sieht deine Bestätigung aus.','Here’s what your confirmation looks like.')}</h4>
      <p>{appointmentText(preview,language)} · {preview.minutes} min</p>
      <p>{t('Das war die Vorschau für dein kostenloses Erstgespräch.','That was a preview of your free intro call.')}</p>
      <button type="button" onClick={()=>{setPreview(undefined);setSelected('');}}>{t('Weitere Beispieltermine','See other sample times')}</button>
    </div>:loading?<p role="status">{t('Ich lade die freien Termine …','Loading available times…')}</p>:
      unavailable?<button type="button" onClick={()=>setReload(reload+1)}>{t('Termine erneut laden','Load available times again')}</button>:
      slots.length?<>
        {previewOnly&&<div className={styles.sample}>
          <strong>{t('Beispieltermine','Sample times')}</strong>
          <p>{t('Wähle eine Uhrzeit, um die Buchung als Vorschau durchzuspielen.','Choose a time to try the booking preview.')}</p>
        </div>}
        <TimeChoices slots={slots} selected={selected} language={language} onSelect={setSelected}/>
        {selectedSlot&&<form key={sample?'sample':'booking'} className={styles.form} onSubmit={book}>
          <label>{t('Dein Name','Your name')}<input name="name" autoComplete={sample?'off':'name'} defaultValue={sample?t('Alex Muster','Alex Sample'):undefined} readOnly={sample} required minLength={2} maxLength={120}/></label>
          <label>{t('Deine E-Mail','Your email')}<input name="email" autoComplete={sample?'off':'email'} defaultValue={sample?'alex@example.com':undefined} readOnly={sample} type="email" required maxLength={250}/></label>
          {!sample&&<>
            <label className={styles.honeypot} aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label>
            <label className={styles.agreement}><input type="checkbox" name="consent" required/><span>{t('Ich habe die Datenschutzhinweise gelesen.','I’ve read the privacy notice.')} <a href={english?'/en/privacy':'/datenschutz'} target="_blank" rel="noreferrer">{t('Datenschutz','Privacy')}</a></span></label>
          </>}
          <button type="submit" className={styles.primary} disabled={busy}>{sample?t('Bestätigung ansehen','Preview confirmation'):busy?t('Termin wird gebucht …','Booking…'):t('Kostenlos buchen','Book a free call')}<ArrowRight size={17} aria-hidden="true"/></button>
          {error&&<div role="alert">{error} <button type="button" onClick={()=>{setSelected('');setError('');setReload(reload+1);}}>{t('Freie Termine prüfen','Check available times')}</button></div>}
        </form>}
      </>:<p>{t('Gerade sind keine Termine freigegeben. Schreib mir gern über das Kontaktformular.','There are no times available right now. Feel free to use the contact form.')}</p>}
  </section>;
}

export function ManageAppointment({language}:{language:SiteLanguage}) {
  const english=language==='en', t=(de:string,en:string)=>english?en:de;
  const [key,setKey]=useState(''),[booking,setBooking]=useState<BookingView>();
  const [busy,setBusy]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [selected,setSelected]=useState(''),[confirmCancel,setConfirmCancel]=useState(false);
  useEffect(()=>{
    const token=location.hash.slice(1);
    setKey(token);
    if(!token){setBusy(false);return;}
    let active=true;
    void post<BookingView>('/api/consultations/manage',{action:'read',key:token},language)
      .then(result=>{if(active)setBooking(result);})
      .catch(reason=>{if(active)setError(reason.message);})
      .finally(()=>{if(active)setBusy(false);});
    return ()=>{active=false;};
  },[language]);
  async function change(action:'change'|'cancel') {
    if(busy||!booking)return;
    setBusy(true);setError('');setNotice('');
    try{
      const result=await post<BookingView>('/api/consultations/manage',{action,key,version:booking.version,
        ...(action==='change'?{slotId:selected}:{})},language);
      setBooking(result);setSelected('');setConfirmCancel(false);
      setNotice(action==='cancel'?t('Die Absage ist gespeichert.','Your cancellation is confirmed.'):t('Der neue Termin ist gebucht.','Your new appointment is confirmed.'));
    }catch(reason){setError(reason instanceof Error?reason.message:t('Bitte versuche es erneut.','Please try again.'));}
    finally{setBusy(false);}
  }
  return <main id="hauptinhalt" className={styles.manage}>
    <section className={styles.booking}>
      <CalendarDays aria-hidden="true" size={28}/><h1>{t('Dein Termin','Your appointment')}</h1>
      {busy&&!booking&&<p role="status">{t('Termin wird geladen …','Loading your appointment…')}</p>}
      {!busy&&!key&&<p>{t('Öffne bitte deinen persönlichen Terminlink.','Please open your personal appointment link.')}</p>}
      {booking&&<>
        <h2>{booking.name}</h2><p>{appointmentText(booking.slot,language)} · {booking.slot.minutes} min</p>
        <p>{booking.status==='cancelled'?t('Abgesagt','Cancelled'):t('Bestätigt','Confirmed')}</p>
        {booking.canChange&&<>
          {booking.options.length>0&&<div><h3>{t('Anderen Zeitpunkt wählen','Choose another time')}</h3>
            <TimeChoices slots={booking.options} selected={selected} onSelect={setSelected} language={language}/>
            <button type="button" className={styles.primary} disabled={!selected||busy} onClick={()=>void change('change')}>{t('Umbuchen','Reschedule')}</button></div>}
          <div className={styles.actions}><a href={ics(booking.slot)} download="termin.ics">{t('Zum Kalender hinzufügen','Add to calendar')}</a>
            {confirmCancel?<button type="button" disabled={busy} onClick={()=>void change('cancel')}>{t('Absage bestätigen','Confirm cancellation')}</button>:
            <button type="button" disabled={busy} onClick={()=>setConfirmCancel(true)}>{t('Termin absagen','Cancel appointment')}</button>}
          </div>
        </>}
      </>}
      {notice&&<p role="status">{notice}</p>}
      {error&&<p role="alert">{error}</p>}
      <a href={english?'/en/contact':'/kontakt'}>{t('Zum Kontakt','Back to contact')}</a>
    </section>
  </main>;
}
