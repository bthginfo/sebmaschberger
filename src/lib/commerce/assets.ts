import {createHash} from 'node:crypto';
import {CommerceError} from './model';
import {COMMERCE_LIMITS} from './contracts';

export interface CommerceAsset {url:string;filename:string;contentType:string;createdAt:string;size?:number;sha256?:string}
export function digitalContentType(bytes:Uint8Array):string|null {
  const b=Buffer.from(bytes);
  if(b.length>=8&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
  if(b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255)return 'image/jpeg';
  if(b.length>=12&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP')return 'image/webp';
  if(b.length>=5&&b.toString('ascii',0,5)==='%PDF-')return 'application/pdf';
  if(b.length>=4&&b[0]===80&&b[1]===75&&[[3,4],[5,6],[7,8]].some(([a,c])=>b[2]===a&&b[3]===c))return 'application/zip';
  return null;
}
export function validateDigitalBytes(bytes:Uint8Array,declared?:string):string {
  if(!bytes.byteLength||bytes.byteLength>COMMERCE_LIMITS.maxFileBytes)throw new CommerceError('Bitte verwende eine Datei bis 4 MB.',413,'ASSET_SIZE');
  const type=digitalContentType(bytes);const normalized=declared==='application/x-zip-compressed'?'application/zip':declared?.split(';')[0].trim();
  if(!type||normalized&&normalized!=='application/octet-stream'&&normalized!==type)throw new CommerceError('Dateiinhalt und Dateityp müssen übereinstimmen. Bitte eine ZIP-, PDF-, PNG-, JPEG- oder WebP-Datei wählen.',400,'ASSET_TYPE');
  return type;
}
export function privateCommerceUrl(value:string):boolean {
  try{const url=new URL(value);return url.protocol==='https:'&&/^[a-z0-9-]+\.private\.blob\.vercel-storage\.com$/i.test(url.hostname)&&!url.username&&!url.password&&!url.search&&!url.hash&&url.pathname.startsWith('/commerce/')&&!decodeURIComponent(url.pathname).split('/').includes('..');}catch{return false;}
}
export function assetPath(productId:string,filename:string){return 'commerce/'+createHash('sha256').update(productId).digest('hex').slice(0,32)+'/'+filename;}
