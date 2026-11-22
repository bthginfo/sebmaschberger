import {commerceDocumentPdf} from '@/lib/commerce/service';
import {handler} from '@/lib/http';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=30;
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return handler(async()=>{const {id}=await params,key=new URL(request.url).searchParams.get('key')||'';const bytes=await commerceDocumentPdf(id,key);return new Response(bytes,{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="bestellbeleg.pdf"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});})(request);}
