import {limitedBody,BodyLimitError} from './business/request-body';
import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AppError } from './db';
import {CommerceError} from './commerce/model';
import { digest } from './security';

export function json(data:unknown,status=200){return NextResponse.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
export function sameOrigin(request:Request):void{
  const origin=request.headers.get('origin');
  const allowed=new Set([new URL(request.url).origin]);
  const host=request.headers.get('host');if(host)allowed.add(new URL(request.url).protocol+'//'+host);
  if(process.env.NEXT_PUBLIC_SITE_URL)try{allowed.add(new URL(process.env.NEXT_PUBLIC_SITE_URL).origin);}catch{}
  const site=request.headers.get('sec-fetch-site');if(site&&site!=='same-origin'&&site!=='same-site'&&site!=='none')throw new AppError('Diese Anfrage ist nicht zulässig.',403);
  if(!origin||!allowed.has(origin))throw new AppError('Diese Anfrage ist nicht zulässig. Bitte öffnen Sie die Seite erneut.',403);
}
export async function readJson(request:Request,max=3*1024*1024):Promise<unknown>{
  if(!request.headers.get('content-type')?.includes('application/json'))throw new AppError('Bitte senden Sie die Anfrage im vorgesehenen Format.',415);
  if(Number(request.headers.get('content-length')||0)>max)throw new AppError('Die Anfrage ist zu groß.',413);
  let bytes:Uint8Array;try{bytes=await limitedBody(request,max);}catch(error){if(error instanceof BodyLimitError)throw new AppError(error.message,413);throw error;}const body=new TextDecoder().decode(bytes);
  try{return JSON.parse(body);}catch{throw new AppError('Die Anfrage konnte nicht gelesen werden.',400);}
}
export function ipKey(request:Request,purpose:string):string{const ip=request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim()||request.headers.get('x-real-ip')||request.headers.get('x-forwarded-for')?.split(',')[0].trim()||'local';return digest(`${purpose}:${ip}:${process.env.AUTH_SECRET||'development'}`);}
export function apiError(error:unknown):NextResponse{
  if(error instanceof CommerceError)return json({error:error.message,code:error.code},error.status);
  if(error instanceof AppError)return json({error:error.message,messages:error.messages},error.status);
  if(error instanceof z.ZodError)return json({error:error.issues[0]?.message||'Bitte prüfen Sie Ihre Angaben.'},400);
  const reference=crypto.randomUUID().slice(0,8);console.error(`[ws-api:${reference}] ${error instanceof Error?error.name:'UnknownError'}`);
  return json({error:`Die Anfrage konnte gerade nicht verarbeitet werden. Bitte versuchen Sie es erneut. Fehlerkennung: ${reference}`},500);
}
export function handler(fn:(request:Request)=>Promise<Response>){return async(request:Request)=>{try{return await fn(request);}catch(error){return apiError(error);}};}
