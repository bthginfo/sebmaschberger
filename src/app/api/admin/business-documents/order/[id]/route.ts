import {requireAdmin} from '@/lib/auth';
import {commerceDocumentPdf} from '@/lib/commerce/service';
import {handler} from '@/lib/http';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=30;
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return handler(async()=>{await requireAdmin(['owner','shop']);const {id}=await params;const bytes=await commerceDocumentPdf(id);return new Response(bytes,{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="bestellbeleg.pdf"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});})(request);}
