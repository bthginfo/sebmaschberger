import {tokenSchema} from './model';

export function queryToken(request:Request){
 return tokenSchema.safeParse(new URL(request.url).searchParams.get('token')).data??'';
}
export async function submittedToken(request:Request,allowOneClick:boolean){
 const type=request.headers.get('content-type')??'';
 if(!type.startsWith('application/x-www-form-urlencoded')&&!type.startsWith('multipart/form-data;'))return '';
 const reader=request.body?.getReader();
 if(!reader)return '';
 const parts:Uint8Array<ArrayBuffer>[]=[];
 let size=0;
 try{
  for(;;){
   const item=await reader.read();
   if(item.done)break;
   size+=item.value.byteLength;
   if(size>2048){await reader.cancel();return '';}
   parts.push(new Uint8Array(item.value));
  }
 }finally{reader.releaseLock();}
 try{
  const form=await new Response(new Blob(parts),{headers:{'Content-Type':type}}).formData();
  if(allowOneClick&&form.get('List-Unsubscribe')==='One-Click')return queryToken(request);
  return tokenSchema.safeParse(form.get('token')).data??'';
 }catch{return '';}
}
