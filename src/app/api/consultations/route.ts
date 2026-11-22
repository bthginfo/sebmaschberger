import {handler,ipKey,json,readJson,sameOrigin} from '@/lib/http';
import {rateLimit} from '@/lib/db';
import {availability,bookAppointment} from '@/lib/consultations/service';
import {newBooking} from '@/lib/consultations/model';

export const dynamic='force-dynamic';
export const maxDuration=30;
export const GET=handler(async()=>json({slots:await availability()}));
export const POST=handler(async(request:Request)=>{
  sameOrigin(request);
  await rateLimit(ipKey(request,'appointment'),8,60*15);
  return json(await bookAppointment(newBooking.parse(await readJson(request,5000))),201);
});
