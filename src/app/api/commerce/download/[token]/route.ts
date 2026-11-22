import {apiError} from '@/lib/http';
import {digitalDownload} from '@/lib/commerce/service';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{token:string}>}){try{const{token}=await params;if(token.length>1000)return new Response('Ungültiger Link',{status:400});return await digitalDownload(token);}catch(error){return apiError(error);}}
