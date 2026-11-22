import {z} from 'zod';

export const appointmentZone = 'Europe/Berlin';
export const slotInput = z.object({
  time:z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u),
  minutes:z.number().int().min(15).max(90).multipleOf(5),
  sample:z.boolean().optional(),
}).strict();

export const newBooking = z.object({
  slotId:z.uuid(),
  name:z.string().trim().min(2).max(120),
  email:z.email().max(250),
  language:z.enum(['de','en']),
  consent:z.literal(true),
  website:z.string().max(300).optional(),
}).strict();

const key = z.string().regex(/^[a-f0-9-]{36}\.[A-Za-z0-9_-]{43}$/iu);
export const manageBooking = z.discriminatedUnion('action',[
  z.object({action:z.literal('read'),key}).strict(),
  z.object({action:z.literal('cancel'),key,version:z.number().int().positive()}).strict(),
  z.object({action:z.literal('change'),key,version:z.number().int().positive(),slotId:z.uuid()}).strict(),
]);

export type AppointmentSlot = { id:string; start:string; minutes:number; sample?:boolean };
export type AppointmentDelivery = 'pending'|'sent'|'unconfigured'|'failed';
export type Appointment = {
  id:string; slot:AppointmentSlot; name:string; email:string; language:'de'|'en'; createdAt:string;
  updatedAt:string; status:'confirmed'|'cancelled'; version:number; unread:boolean; tokenHash:string;
  delivery:{guest:AppointmentDelivery;host:AppointmentDelivery};
};
export type AppointmentStore = { slots:AppointmentSlot[]; bookings:Appointment[] };
export const emptyAppointmentStore: AppointmentStore = {slots:[],bookings:[]};

export function futureSlots(store:AppointmentStore,now=Date.now()) {
  const taken = new Set(store.bookings.filter(item=>item.status==='confirmed').map(item=>item.slot.id));
  return store.slots.filter(slot=>Date.parse(slot.start)>now&&!taken.has(slot.id))
    .sort((first,second)=>first.start.localeCompare(second.start));
}

export function overlaps(first:AppointmentSlot,second:AppointmentSlot) {
  const a=Date.parse(first.start),b=Date.parse(second.start);
  return a < b + second.minutes*60000 && b < a + first.minutes*60000;
}

export function appointmentText(slot:AppointmentSlot,language:'de'|'en') {
  return new Intl.DateTimeFormat(language==='de'?'de-DE':'en-GB',{
    timeZone:appointmentZone,weekday:'short',day:'numeric',month:'short',year:'numeric',
    hour:'2-digit',minute:'2-digit',timeZoneName:'short',
  }).format(new Date(slot.start));
}

export function appointmentManagePath(language:'de'|'en') {
  return language==='en'?'/en/appointment/manage':'/termin/verwalten';
}
