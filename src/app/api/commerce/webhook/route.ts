import {z} from 'zod';
import {AppError} from '@/lib/db';
import {handler,json} from '@/lib/http';
import {verifyStripeSignature} from '@/lib/commerce/model';
import {handleStripeEvent} from '@/lib/commerce/service';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=30;
export const POST=handler(async(request)=>{const secret=process.env.STRIPE_WEBHOOK_SECRET;if(!secret)throw new AppError('Die Zahlungsanbindung ist nicht eingerichtet.',503);if(Number(request.headers.get('content-length')||0)>256000)throw new AppError('Die Nachricht ist zu groß.',413);const body=await request.text();if(body.length>256000)throw new AppError('Die Nachricht ist zu groß.',413);if(!verifyStripeSignature(body,request.headers.get('stripe-signature')||'',secret))throw new AppError('Die Zahlungssignatur ist ungültig.',400);let parsed:unknown;try{parsed=JSON.parse(body);}catch{throw new AppError("Die Nachricht ist ungültig.",400);}
const event=z.object({id:z.string().min(1).max(150),type:z.string().max(150),livemode:z.boolean(),data:z.object({object:z.record(z.string(),z.unknown())})}).parse(parsed);await handleStripeEvent(event);return json({received:true});});
