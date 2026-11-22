import 'server-only';
import {after} from 'next/server';
import {randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {AppError,getPublishedConfig,getRecord,getSettings,mutateRecord} from '../db';
import {digest} from '../security';
import {resolveWallTime} from '../social/publishing/time';
import {getBusinessSettings} from '../business/service';
import {brandedEmail} from '../business/design';
import {sendReservationMail} from '../mail';
import {notifyWorkspaceAccounts} from '../workspace-push/store';
import {appointmentManagePath,appointmentText,appointmentZone,emptyAppointmentStore,futureSlots,overlaps,
  type Appointment,type AppointmentDelivery,type AppointmentSlot,type AppointmentStore,type manageBooking,type newBooking,type slotInput} from './model';
import type {z} from 'zod';
import type { SiteSettings } from '../types';

const collection='consultations', id='main';
const read = async () => await getRecord<AppointmentStore>(collection,id) ?? emptyAppointmentStore;
const update = (change:(store:AppointmentStore)=>AppointmentStore) => mutateRecord(collection,id,emptyAppointmentStore,change);

export async function bookingEnabled() {
  return (await getPublishedConfig()).modules?.consultations?.enabled === true;
}
export async function availability() {
  return await bookingEnabled() ? futureSlots(await read()).slice(0,180) : [];
}
export async function adminAppointments() {
  const store=await read();
  return {
    slots:store.slots.filter(slot=>Date.parse(slot.start)>Date.now()).sort((a,b)=>a.start.localeCompare(b.start)),
    bookings:[...store.bookings].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(({tokenHash:_private,...item})=>item),
    smtp:(await getSettings()).smtp.enabled,
  };
}

export async function addAppointmentSlot(input:z.infer<typeof slotInput>) {
  const now=Date.now();
  const matches=resolveWallTime(input.time,appointmentZone);
  if(matches.length!==1||Date.parse(matches[0].instant)<=now)throw new AppError('Wählen Sie eine eindeutige Uhrzeit in der Zukunft.');
  const slot={id:randomUUID(),start:matches[0].instant,minutes:input.minutes};
  await update(store=>{
    const upcoming=store.slots.filter(entry=>Date.parse(entry.start)>now);
    if(upcoming.length>=180)throw new AppError('Es können bis zu 180 kommende Termine freigegeben werden.',409);
    if(upcoming.some(entry=>overlaps(entry,slot)))throw new AppError('Dieses Zeitfenster überschneidet sich mit einem anderen Termin.',409);
    return {...store,slots:[...upcoming,slot]};
  });
}
export async function removeAppointmentSlot(slotId:string) {
  await update(store=>{
    if(store.bookings.some(item=>item.slot.id===slotId&&item.status==='confirmed'))throw new AppError('Dieser Termin ist bereits gebucht.',409);
    return {...store,slots:store.slots.filter(slot=>slot.id!==slotId)};
  });
}
export async function seeAppointment(bookingId:string) {
  await update(store=>({...store,bookings:store.bookings.map(item=>item.id===bookingId?{...item,unread:false}:item)}));
}
function selectSlot(store:AppointmentStore,slotId:string) {
  const slot=futureSlots(store).find(entry=>entry.id===slotId);
  if(!slot)throw new AppError('Dieses Zeitfenster ist nicht mehr frei.',409);
  return slot;
}

async function notify(item:Appointment,secret:string,kind:'booked'|'changed'|'cancelled',settings:SiteSettings) {
  after(() => notifyWorkspaceAccounts('cms',['cms-owner'],'appointments'));
  const guestLink=settings.siteUrl.replace(/\/$/u,'')+appointmentManagePath(item.language)+'#'+item.id+'.'+secret;
  const available=settings.smtp.enabled&&process.env.SMTP_ENABLED!=='false';
  const outcomes:{guest:AppointmentDelivery;host:AppointmentDelivery}={guest:'unconfigured',host:'unconfigured'};
  if(available) {
    try {
      const business=await getBusinessSettings();
      const english=item.language==='en';
      const guestHeading=kind==='booked'?(english?'Your appointment is confirmed.':'Dein Termin ist bestätigt.'):kind==='changed'?(english?'Your appointment has moved.':'Dein Termin wurde umgebucht.'):(english?'Your appointment was cancelled.':'Dein Termin wurde abgesagt.');
      const hostHeading=kind==='booked'?'Ein neuer Termin wurde gebucht.':kind==='changed'?'Ein Termin wurde umgebucht.':'Ein Termin wurde abgesagt.';
      const guestBody=(english?'Hello ':'Hallo ')+item.name+',\n\n'+guestHeading+'\n'+appointmentText(item.slot,item.language)+' · '+item.slot.minutes+' min';
      const hostBody=hostHeading+'\n\n'+appointmentText(item.slot,'de')+' · '+item.slot.minutes+' Min.\n'+item.name+'\n'+item.email;
      async function send(to:string,heading:string,body:string,actionLabel:string,actionUrl:string,language:'de'|'en'):Promise<AppointmentDelivery>{
        if(!to)return 'unconfigured';
        const subject=business.design.brandName+' · '+heading;
        try {
          await sendReservationMail({to,subject,text:body+'\n\n'+actionUrl,html:brandedEmail({subject,heading,body,actionLabel,actionUrl,design:business.design,language})});
          return 'sent';
        } catch { return 'failed'; }
      }
      const [guest,host]=await Promise.all([
        send(item.email,guestHeading,guestBody,english?'Manage your appointment':'Termin verwalten',guestLink,item.language),
        send(settings.smtp.to,hostHeading,hostBody,'Termine im CMS öffnen',settings.siteUrl.replace(/\/$/u,'')+'/admin/termine','de'),
      ]);
      outcomes.guest=guest;
      outcomes.host=host;
    } catch { outcomes.guest=outcomes.host='failed'; }
  }
  await update(store=>({...store,bookings:store.bookings.map(entry=>entry.id===item.id&&entry.version===item.version?{...entry,delivery:outcomes}:entry)})).catch(()=>undefined);
  return {guest:outcomes.guest,link:guestLink};
}

export async function bookAppointment(input:z.infer<typeof newBooking>) {
  if(input.website)throw new AppError('Die Buchung konnte nicht verarbeitet werden.');
  const [enabled,settings]=await Promise.all([bookingEnabled(),getSettings()]);
  if(!enabled)throw new AppError('Die Terminbuchung ist momentan geschlossen.',404);
  const instant=Date.now();
  const bookingId=randomUUID(),secret=randomBytes(32).toString('base64url'),now=new Date(instant).toISOString();
  const retainAfter=instant-settings.retentionDays*86400000;
  const saved=await update(store=>{
    const slot=selectSlot(store,input.slotId);
    const booking:Appointment={id:bookingId,slot,name:input.name,email:input.email,language:input.language,
      status:'confirmed',createdAt:now,updatedAt:now,version:1,unread:true,tokenHash:digest(secret),
      delivery:{guest:'pending',host:'pending'}};
    const retained=store.bookings.filter(entry=>
      Date.parse(entry.updatedAt)>retainAfter || (entry.status==='confirmed' && Date.parse(entry.slot.start)>instant)
    );
    return {...store,bookings:[...retained,booking]};
  });
  const item=saved.bookings.find(entry=>entry.id===bookingId)!;
  const sent=await notify(item,secret,'booked',settings);
  return {slot:item.slot,name:item.name,link:sent.link,delivery:sent.guest};
}

function authorized(store:AppointmentStore,bookingId:string,secret:string) {
  const item=store.bookings.find(entry=>entry.id===bookingId);
  const expected=Buffer.from(item?.tokenHash??'', 'hex'),actual=Buffer.from(digest(secret),'hex');
  if(!item||expected.length!==actual.length||!timingSafeEqual(expected,actual))throw new AppError('Der Terminlink ist nicht verfügbar.',404);
  return item;
}
export async function manageAppointment(input:z.infer<typeof manageBooking>) {
  const [bookingId,secret]=input.key.split('.');
  const current=await read();
  const initial=authorized(current,bookingId,secret);
  const visible=(item:Appointment,options:AppointmentSlot[])=>({name:item.name,slot:item.slot,status:item.status,
    canChange:item.status==='confirmed'&&Date.parse(item.slot.start)>Date.now(),version:item.version,options});
  const enabled=await bookingEnabled();
  if(input.action==='read')return visible(initial,enabled?futureSlots(current).slice(0,180):[]);
  if(input.action==='cancel'&&initial.status==='cancelled')return visible(initial,[]);
  if(input.action==='change'&&!enabled)throw new AppError('Die Umbuchung ist momentan geschlossen.',409);
  const settings=await getSettings();
  const changedAt=new Date().toISOString();
  const updated=await update(store=>{
    const item=authorized(store,bookingId,secret);
    if(item.version!==input.version||item.status!=='confirmed'||Date.parse(item.slot.start)<=Date.now())throw new AppError('Der Termin kann in dieser Fassung nicht geändert werden.',409);
    const slot=input.action==='change'?selectSlot(store,input.slotId):item.slot;
    const next:Appointment={...item,slot,status:input.action==='cancel'?'cancelled':'confirmed',
      updatedAt:changedAt,version:item.version+1,unread:true,delivery:{guest:'pending',host:'pending'}};
    return {...store,bookings:store.bookings.map(entry=>entry.id===bookingId?next:entry)};
  });
  const item=updated.bookings.find(entry=>entry.id===bookingId)!;
  await notify(item,secret,input.action==='cancel'?'cancelled':'changed',settings);
  return visible(item,enabled?futureSlots(updated).slice(0,180):[]);
}
