import {z} from 'zod';
import {ipKey,json,readJson,sameOrigin} from '@/lib/http';
import {commerceHandler as handler} from '@/lib/commerce/http';
import {rateLimit} from '@/lib/db';
import {createCheckout} from '@/lib/commerce/service';
import {COMMERCE_LIMITS} from '@/lib/commerce/contracts';
export const runtime='nodejs';export const dynamic='force-dynamic';
const attemptKey=z.string().min(16).max(100).regex(/^[a-zA-Z0-9_-]+$/);
export const POST=handler(async(request)=>{sameOrigin(request);await rateLimit(ipKey(request,'checkout'),12,15*60);const key=attemptKey.parse(request.headers.get('idempotency-key'));const {items,previousKey,previousKeys,country}=z.object({items:z.array(z.object({productId:z.string().min(1).max(150),variant:z.string().max(100).optional(),quantity:z.number().int().min(1).max(20)})).min(1).max(30),country:z.string().regex(/^[A-Z]{2}$/).optional(),previousKey:attemptKey.optional(),previousKeys:z.array(attemptKey).max(COMMERCE_LIMITS.checkoutAncestors,'Zu viele unterbrochene Kassen. Bitte den vorhandenen Bestelllink verwenden oder den Shop kontaktieren.').optional()}).strict().parse(await readJson(request,12000));return json(await createCheckout(items,key,previousKey,previousKeys,country));});
