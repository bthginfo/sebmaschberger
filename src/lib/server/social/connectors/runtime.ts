import {carouselItemsReady} from '@/lib/social/publishing/carousel';
import 'server-only';
import {activeSession} from '@/lib/auth';
import {AppError} from '@/lib/db';
import {publishingEnabled,publishingRepository,plannerReadiness,publicPublishingOrigin} from '../publishing/store';
import {readPublishingMedia,providerMediaUrl} from '../publishing/media-read';
import {assertPublishingSource,wakeFor} from '../publishing/types';
import {connectorRepository} from './repository';
import {createConnectorCrypto} from './crypto';
import {createConnectorClients} from './registry';
import {createConnectorService} from './service';
import {createNativePipeline} from './pipeline';
import {nativePause} from './publication-state';
import {ConnectorError} from './provider-contract';

const now=()=>new Date().toISOString();
export const connectorCipher=createConnectorCrypto(()=>process.env.AUTH_SECRET||'','website-starter-native-social-v1');
export const connectorClients=createConnectorClients({fetch:(...args)=>fetch(...args),now});
export const connectorService=createConnectorService({repo:connectorRepository,cipher:connectorCipher,clients:connectorClients,now,
 enabled:publishingEnabled,brandAllowed:brand=>brand==='default',
 origin:async()=>{const origin=await publicPublishingOrigin();if(!origin)throw new ConnectorError('Bitte zuerst die eigene HTTPS-Website-Adresse unter Einstellungen speichern.','configuration');return origin;},
 actorActive:async actor=>actor.id==='admin'&&(await activeSession(actor.sessionId))?.role==='owner',
 pauseAccount:async(id,reason)=>{for(const row of await publishingRepository.publications()){if(row.entry.accountId!==id||!row.entry.approval)continue;await publishingRepository.mutatePublication(row.entry.id,current=>current?{...current,entry:nativePause(current.entry,reason,now()),approvedEpoch:null,wake:null}:row);}}
});
export const nativePipeline=createNativePipeline({repo:connectorRepository,cipher:connectorCipher,service:connectorService,clients:connectorClients,now,
 ready:async()=>{const r=await plannerReadiness();return r.enabled&&r.queue&&r.media&&r.publicOrigin&&r.credentials!==false;},
 epochValid:async id=>{const row=await publishingRepository.publication(id);return Boolean(row&&row.approvedEpoch===await publishingRepository.epoch());},
 load:async id=>(await publishingRepository.publication(id))?.entry??null,
 update:async(id,work)=>(await publishingRepository.mutatePublication(id,current=>{if(!current)throw new AppError('Diese Planung fehlt.',404);const entry=work(current.entry);return entry===current.entry?current:{...current,entry,wake:wakeFor(entry)};})).entry,
 media:async entry=>{const row=await publishingRepository.publication(entry.id);if(!row)throw new ConnectorError('Dieser Planungsstand fehlt.');assertPublishingSource(row);if(!entry.media)return null;if(entry.carousel&&!carouselItemsReady(entry))throw new ConnectorError('Die vollständige Carousel-Bildfolge fehlt.');const metadata=entry.carousel?entry.mediaItems!:[entry.media],files=await Promise.all(metadata.map(async item=>{const file=await readPublishingMedia(item.id);if(file.publicationId!==entry.id||file.data.sha256!==item.sha256||file.data.sourceHash!==entry.source.snapshotHash||file.data.slideIndex!==item.slideIndex)throw new ConnectorError('Die private Datei gehört zu einem anderen Planungsstand.');return{bytes:file.bytes,mimeType:file.data.mimeType,width:file.data.width,height:file.data.height,durationMs:file.data.durationMs??undefined,sha256:file.data.sha256};}));return{...files[0],...(entry.carousel?{items:files}:{})};},
 mediaUrl:providerMediaUrl,mediaUrls:async(entry,at)=>Promise.all((entry.mediaItems??[]).map(item=>providerMediaUrl(entry,at,item.id))),dispatch:async id=>{const {publishingScheduler}=await import('../publishing/runtime');return publishingScheduler.dispatch(id);}
});
export async function nativeAccountViews(){return(await connectorRepository.list('accounts')).map(connectorService.accountView);}
export async function nativeAccountView(id:string){const row=await connectorRepository.get('accounts',id);return row?connectorService.accountView(row):null;}
