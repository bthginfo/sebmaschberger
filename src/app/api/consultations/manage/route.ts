import {handler,ipKey,json,readJson,sameOrigin} from '@/lib/http';
import {rateLimit} from '@/lib/db';
import {manageBooking} from '@/lib/consultations/model';
import {manageAppointment} from '@/lib/consultations/service';

export const dynamic='force-dynamic';
export const maxDuration=30;
export const POST=handler(async(request:Request)=>{
  sameOrigin(request);
  await rateLimit(ipKey(request,'manage-appointment'),24,60);
  return json(await manageAppointment(manageBooking.parse(await readJson(request,3000))));
});
