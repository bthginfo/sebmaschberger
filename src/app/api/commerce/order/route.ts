import {z} from 'zod';
import {ipKey,json,readJson,sameOrigin} from '@/lib/http';
import {rateLimit} from '@/lib/db';
import {commerceHandler as handler} from '@/lib/commerce/http';
import {publicOrder,orderAction} from '@/lib/commerce/service';
export const dynamic='force-dynamic';
export const GET=handler(async(request)=>{const params=new URL(request.url).searchParams;return json(await publicOrder((params.get('order')||'').slice(0,100),(params.get('key')||'').slice(0,100)));});
export const POST=handler(async(request)=>{sameOrigin(request);await rateLimit(ipKey(request,'order-recovery'),20,15*60);const value=z.object({order:z.string().min(1).max(100),key:z.string().length(43),action:z.enum(['refresh','resume','cancel'])}).parse(await readJson(request,1000));return json(await orderAction(value.order,value.key,value.action));});
