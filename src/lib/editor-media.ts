import 'server-only';
import {put,del} from '@vercel/blob';
import {randomUUID} from 'node:crypto';
import {AppError,deleteRecord,getRecord,hasRetainedMediaReference,setRecord} from './db';
import {createMediaOperations,MediaOperationError} from './media-operations';
import type {MediaAsset} from './types';
const privateMedia = () => process.env.WS_BLOB_SQLITE === '1';
const prefix = '/api/editor-media/';
const media=createMediaOperations({
 configured:()=>Boolean(process.env.BLOB_READ_WRITE_TOKEN),
 put: async (path, bytes) => {
  if (!privateMedia()) return put(path,bytes,{access:'public',addRandomSuffix:true,contentType:'image/webp',token:process.env.BLOB_READ_WRITE_TOKEN});
  const filename = randomUUID() + '.webp';
  await put('editor-media/' + filename, bytes, {access:'private',addRandomSuffix:false,contentType:'image/webp'});
  return {url:prefix + filename};
 },
 removeBlob:async url=>{await del(url.startsWith(prefix) ? 'editor-media/' + url.slice(prefix.length) : url,{token:process.env.BLOB_READ_WRITE_TOKEN});},
 save:async asset=>setRecord('media',asset.id,asset),find:async id=>getRecord<MediaAsset>('media',id),
 referenced:hasRetainedMediaReference,removeRecord:async id=>deleteRecord('media',id)
});
async function mapped<T>(operation:()=>Promise<T>){try{return await operation();}catch(error){if(error instanceof MediaOperationError)throw new AppError(error.message,error.status);throw error;}}
export function uploadEditorMedia(file:File,alt=''){return mapped(()=>media.upload(file,alt));}
export function deleteEditorMedia(id:string){return mapped(()=>media.remove(id));}
