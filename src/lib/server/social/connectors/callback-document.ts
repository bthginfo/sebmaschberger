import {randomBytes} from 'node:crypto';
import {CONNECTOR_PROVIDERS,type ConnectorProvider} from '../../../social/connectors/model';
import {ConnectorError} from './provider-contract';

export function callbackProvider(value:string):ConnectorProvider{if(!(CONNECTOR_PROVIDERS as readonly string[]).includes(value)||value==='bluesky')throw new ConnectorError('Dieser Anbieter verwendet keine OAuth-Rückkehr.');return value as ConnectorProvider;}
const escape=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
/** No external assets, provider error payloads, or credentials in this document. */
export function callbackDocument(input:{origin:string;provider:ConnectorProvider;flowId:string|null;success:boolean;plannerPath:string}){
 const nonce=randomBytes(24).toString('base64'),href=input.plannerPath+(input.flowId?'?connection_flow='+encodeURIComponent(input.flowId):''),message=input.success?'Anmeldung geprüft. Wählen Sie jetzt im CMS das Zielkonto aus.':'Die Anmeldung konnte nicht bestätigt werden. Bitte starten Sie die Verbindung im CMS erneut.';
 const script=`history.replaceState(null,'',${JSON.stringify('/api/social/connectors/callback/'+input.provider)});if(window.opener&&${JSON.stringify(Boolean(input.flowId))}){window.opener.postMessage(${JSON.stringify({type:'kantiq.connector.complete',flowId:input.flowId})},${JSON.stringify(input.origin)});window.close();}`;
 const html='<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Konto verbinden · CMS</title><style nonce="'+nonce+'">body{font:17px/1.6 system-ui;margin:0;background:#f7f6f1;color:#143142;min-height:100dvh;display:grid;place-items:center}main{box-sizing:border-box;width:min(100%,34rem);padding:32px}a{display:inline-block;color:inherit;padding:12px 0;text-underline-offset:5px}h1{font-size:28px;line-height:1.2}</style><main><h1>'+escape(input.success?'Zurück ins CMS':'Verbindung prüfen')+'</h1><p>'+escape(message)+'</p><a href="'+escape(href)+'">Im Post-Planer fortfahren →</a></main><script nonce="'+nonce+'">'+script+'</script></html>';
 return new Response(html,{status:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; script-src 'nonce-"+nonce+"'; style-src 'nonce-"+nonce+"'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"}});
}
