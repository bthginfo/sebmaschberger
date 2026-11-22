"use client";

import {useEffect,useState,type FormEvent} from 'react';
import {CalendarDays,Clock3,Plus,Trash2} from 'lucide-react';
import {appointmentText,type Appointment,type AppointmentSlot} from '@/lib/consultations/model';
import {api,Button,Field,Input,Notice,errorMessage} from './admin-ui';
import {useAdminLanguage} from './admin-language';
import styles from './appointments-manager.module.css';

type Snapshot={slots:AppointmentSlot[];bookings:Omit<Appointment,'tokenHash'>[];smtp:boolean};

export function AppointmentsManager() {
  const {language}=useAdminLanguage();
  const t=(de:string,en:string)=>language==='en'?en:de;
  const [data,setData]=useState<Snapshot>();
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{
    const controller=new AbortController();
    void api<Snapshot>('/api/admin/consultations',{signal:controller.signal}).then(setData).catch(reason=>{if(!controller.signal.aborted)setError(errorMessage(reason));});
    return()=>controller.abort();
  },[]);
  async function update(values:Record<string,unknown>) {
    if(busy)return;
    setBusy(true);setError('');
    try {setData(await api<Snapshot>('/api/admin/consultations',{method:'POST',body:JSON.stringify(values)}));}
    catch(reason){setError(errorMessage(reason));}
    finally{setBusy(false);}
  }
  async function add(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields=new FormData(event.currentTarget);
    await update({action:'add',slot:{time:String(fields.get('time')),minutes:Number(fields.get('minutes'))}});
  }
  const unread=data?.bookings.filter(item=>item.unread).length??0;
  const taken=new Set(data?.bookings.filter(item=>item.status==='confirmed').map(item=>item.slot.id));
  const status=(value:string)=>({
    sent:t('Gesendet','Sent'),failed:t('Versandfehler','Delivery failed'),
    pending:t('Ausstehend','Pending'),unconfigured:t('SMTP noch offen','SMTP setup pending'),
  } as Record<string,string>)[value];
  return <div className="cms-page cms-appointments">
    <div className="cms-page-heading"><div><h1>{t('Termine','Appointments')}</h1><p>{t('Geben Sie Zeitfenster frei und sehen Sie neue Buchungen, Umbuchungen und Absagen.','Open time slots and review new bookings, changes and cancellations.')}</p></div></div>
    {error&&<Notice tone="error">{error}</Notice>}
    {data&&!data.smtp&&<Notice>{t('E-Mail-Benachrichtigungen können Sie unter Einstellungen → E-Mail-Versand verbinden. Gäste erhalten ihren persönlichen Terminlink auch direkt nach der Buchung.','Connect email notifications under Settings → Email. Guests also receive their appointment link directly after booking.')}</Notice>}
    <div className={styles.layout}>
      <section className={styles.panel}>
        <div className={styles.title}><CalendarDays size={21} aria-hidden="true"/><h2>{t('Zeitfenster','Availability')}</h2></div>
        <form className={styles.form} onSubmit={add}>
          <Field label={t('Datum und Uhrzeit in Berlin','Date and time in Berlin')}><Input type="datetime-local" name="time" required/></Field>
          <Field label={t('Dauer in Minuten','Duration in minutes')}><Input type="number" name="minutes" min={15} max={90} step={5} defaultValue={20} required/></Field>
          <Button type="submit" variant="primary" busy={busy} disabled={busy||!data}><Plus size={16} aria-hidden="true"/>{t('Zeitfenster freigeben','Open time slot')}</Button>
        </form>
        {data&&!data.slots.length&&<p>{t('Aktuell sind keine Zeitfenster eingetragen.','There are no time slots yet.')}</p>}
        <ul className={styles.list}>{data?.slots.map(slot=><li key={slot.id}>
          <div><strong>{appointmentText(slot,language)}</strong><p>{slot.minutes} min · {taken.has(slot.id)?t('Gebucht','Booked'):t('Frei','Available')}</p></div>
          {!taken.has(slot.id)&&<Button disabled={busy} onClick={()=>void update({action:'remove',id:slot.id})}><Trash2 size={15} aria-hidden="true"/>{t('Entfernen','Remove')}</Button>}
        </li>)}</ul>
      </section>
      <section className={styles.panel}>
        <div className={styles.title}><Clock3 size={21} aria-hidden="true"/><h2>{t('Buchungen','Bookings')}</h2>{unread>0&&<span className={styles.badge}>{unread} {t('neu','new')}</span>}</div>
        {data&&!data.bookings.length&&<p>{t('Neue Buchungen erscheinen hier.','New bookings will appear here.')}</p>}
        <ul className={styles.list}>{data?.bookings.map(booking=><li key={booking.id}>
          <div><strong>{booking.name}</strong><p>{appointmentText(booking.slot,language)} · {booking.status==='confirmed'?t('Bestätigt','Confirmed'):t('Abgesagt','Cancelled')}</p>
            <p><a href={`mailto:${booking.email}`}>{booking.email}</a></p>
            <p>{t('Gast','Guest')} · {status(booking.delivery.guest)}<br/>{t('Host','Host')} · {status(booking.delivery.host)}</p></div>
          {booking.unread&&<Button disabled={busy} onClick={()=>void update({action:'seen',id:booking.id})}>{t('Als gelesen markieren','Mark as read')}</Button>}
        </li>)}</ul>
      </section>
    </div>
  </div>;
}
