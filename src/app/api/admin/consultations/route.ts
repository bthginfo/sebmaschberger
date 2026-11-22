import {z} from 'zod';
import {requireAdmin} from '@/lib/auth';
import {getDraftConfig,AppError} from '@/lib/db';
import {handler,json,readJson,sameOrigin} from '@/lib/http';
import {slotInput} from '@/lib/consultations/model';
import {addAppointmentSlot,adminAppointments,removeAppointmentSlot,seeAppointment} from '@/lib/consultations/service';

export const dynamic='force-dynamic';
export const GET=handler(async()=>{
  await requireAdmin();
  return json(await adminAppointments());
});
export const POST=handler(async(request:Request)=>{
  sameOrigin(request);
  await requireAdmin();
  if(!(await getDraftConfig()).modules?.consultations?.enabled)throw new AppError('Aktivieren Sie zuerst die Terminbuchung.',409);
  const input=z.discriminatedUnion('action',[
    z.object({action:z.literal('add'),slot:slotInput}).strict(),
    z.object({action:z.literal('remove'),id:z.uuid()}).strict(),
    z.object({action:z.literal('seen'),id:z.uuid()}).strict(),
  ]).parse(await readJson(request,3500));
  if(input.action==='add')await addAppointmentSlot(input.slot);
  else if(input.action==='remove')await removeAppointmentSlot(input.id);
  else await seeAppointment(input.id);
  return json(await adminAppointments());
});
