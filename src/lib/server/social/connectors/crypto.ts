import {createCipheriv,createDecipheriv,createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {ConnectorError} from './provider-contract';
export const connectorHash=(value:unknown)=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
export function constantHashEquals(a:string,b:string){return /^[a-f0-9]{64}$/.test(a)&&/^[a-f0-9]{64}$/.test(b)&&timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));}
export function createConnectorCrypto(secret:()=>string,namespace:string){
 function key(){const value=secret();if(value.length<32)throw new ConnectorError('Die verschlüsselte Zugangsspeicherung muss zuerst auf dem Server eingerichtet werden.','configuration');return createHash('sha256').update('social-connectors-v1\0'+namespace+'\0'+value).digest();}
 function seal(kind:string,id:string,value:unknown){const json=JSON.stringify(value);if(Buffer.byteLength(json)>262144)throw new ConnectorError('Der private Verbindungsstand ist zu groß.');const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);cipher.setAAD(Buffer.from(namespace+'\0'+kind+'\0'+id));const encrypted=Buffer.concat([cipher.update(json,'utf8'),cipher.final()]);return['c1',iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),encrypted.toString('base64url')].join('.');}
 function open<T>(kind:string,id:string,value:string):T{try{const [version,iv,tag,body,...rest]=value.split('.');if(version!=='c1'||rest.length||!iv||!tag||!body)throw Error();const decipher=createDecipheriv('aes-256-gcm',key(),Buffer.from(iv,'base64url'));decipher.setAAD(Buffer.from(namespace+'\0'+kind+'\0'+id));decipher.setAuthTag(Buffer.from(tag,'base64url'));return JSON.parse(Buffer.concat([decipher.update(Buffer.from(body,'base64url')),decipher.final()]).toString('utf8'));}catch{throw new ConnectorError('Der private Verbindungsstand konnte nicht gelesen werden. Bitte die Verbindung neu einrichten.','configuration');}}
 return{seal,open};
}
