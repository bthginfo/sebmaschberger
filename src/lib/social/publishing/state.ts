import {carouselItemsReady,carouselMediaKey,validCarouselSource} from './carousel';
import {effectiveDelivery,effectivePlatform,isAutomaticInstagram,isReferenceSource,publicationDraftSchema,publicationRecordSchema,publishingMediaSchema,type PublicationDraft,type PublicationRecord,type PublishingMedia} from './model';
import {preparationTime} from './time';
export class PublishingStateError extends Error{constructor(message:string,public status=409){super(message);}}
const idle=():PublicationRecord['process']=>({phase:'idle',containerId:null,containerCreatedAt:null,polls:0,publishStartedAt:null,mediaId:null,confirmedAt:null,lastError:null});
const change=(previous:PublicationRecord,patch:Partial<PublicationRecord>,at:string):PublicationRecord=>publicationRecordSchema.parse({...previous,...patch,revision:previous.revision+1,updatedAt:at});
/** Optional keys stay absent for historical approvals; new keys bind the exact destination. */
export function publicationContentKey(draft:PublicationDraft & {mediaItems?:PublishingMedia[]},media:PublishingMedia|null){return JSON.stringify({source:draft.source.snapshotHash,kind:draft.kind,slideIndex:draft.slideIndex,caption:draft.caption,altText:draft.altText,accountId:draft.accountId,scheduledAt:draft.scheduledAt,timeZone:draft.timeZone,media:media?.sha256??null,...(draft.carousel?{carousel:true,carouselMedia:carouselMediaKey(draft.mediaItems),carouselAltTexts:draft.carouselAltTexts??null}:{}),...(draft.platform!==undefined?{platform:draft.platform}:{}),...(draft.connectionMode!==undefined?{connectionMode:draft.connectionMode}:{}),...(draft.delivery!==undefined?{delivery:draft.delivery}:{}),...(draft.targetLabel!==undefined?{targetLabel:draft.targetLabel}:{}),...(draft.providerOptions!==undefined?{providerOptions:draft.providerOptions}:{})});}
export function assertAutomaticPublication(entry:PublicationDraft){
 if(entry.carousel||!isAutomaticInstagram(entry)||entry.kind==='text'||isReferenceSource(entry.source)||Object.keys(entry.providerOptions??{}).length>0)throw new PublishingStateError('Für diesen älteren Instagram-Versandweg bitte eigene vorbereitete Einzelmedien verwenden. Andere Kanäle und Carousels nutzen die direkte Verbindung unter „Kanäle verbinden“.');
}
export function assertPlanningDraft(draft:PublicationDraft){
 if(draft.carousel&&!validCarouselSource(draft))throw new PublishingStateError('Carousels benötigen 2 bis 20 eigene Studio-Folien und die direkte Instagram-Verbindung.');
 if(effectiveDelivery(draft)==='handoff'&&effectivePlatform(draft)!=='tiktok'||effectiveDelivery(draft)==='automatic'&&effectivePlatform(draft)==='tiktok')throw new PublishingStateError('TikTok-Videos werden zur Freigabe in die App übergeben. Bitte die passende Übergabeart wählen.');
 if(effectiveDelivery(draft)==='manual'&&draft.accountId!==null)throw new PublishingStateError('Für eine manuelle Planung bitte kein Konto für automatischen Versand zuordnen.');
 if(isReferenceSource(draft.source)){
  if((effectiveDelivery(draft)!=='manual'&&!(draft.source.kind==='note'&&effectivePlatform(draft)!=='instagram'&&effectivePlatform(draft)!=='youtube'&&effectivePlatform(draft)!=='tiktok'&&effectivePlatform(draft)!=='pinterest'))||draft.slideIndex!==0||draft.kind!==(draft.source.kind==='note'?'text':draft.source.kind==='reel'?'reel':'image'))throw new PublishingStateError('Die Notiz oder Originaladresse kann ausschließlich mit der passenden Medienart manuell geplant werden.');
 }else if(draft.kind==='text')throw new PublishingStateError('Für einen Textbeitrag bitte eine eigene Notiz als Quelle verwenden.');
}
export function newPublication(input:PublicationDraft,at:string):PublicationRecord{
 const draft=publicationDraftSchema.parse({...input,platform:input.platform??'instagram',delivery:input.delivery??'manual',targetLabel:input.targetLabel??''});assertPlanningDraft(draft);
 return publicationRecordSchema.parse({...draft,revision:1,status:effectiveDelivery(draft)==='manual'?'manual_planned':'draft',generation:1,media:null,approval:null,process:idle(),nextActionAt:null,lease:null,manualCompletion:null,createdAt:at,updatedAt:at});
}
/** Uploaded sources are bound to one registered immutable prepared file. */
export function uploadMediaMatches(source:PublicationDraft['source'],media:PublishingMedia|null){return source.origin==='upload'&&Boolean(media&&source.uploadId===media.id&&source.snapshotHash===media.sha256&&source.snapshotHash===media.sourceHash&&media.slideIndex===0&&media.kind===(source.kind==='reel'?'reel':'image')&&media.mimeType===(source.kind==='reel'?'video/mp4':'image/jpeg'));}
export function acceptUploadedPublication(previous:PublicationRecord|null,input:PublicationDraft,file:PublishingMedia,at:string):PublicationRecord{
 const draft=publicationDraftSchema.parse(input),media=publishingMediaSchema.parse(file);assertPlanningDraft(draft);
 if(draft.source.origin!=='upload'||draft.slideIndex!==0||draft.kind!==media.kind||!uploadMediaMatches(draft.source,media))throw new PublishingStateError('Die hochgeladene Datei gehört nicht zu diesem geprüften Stand.');
 if(previous){
  if(previous.source.origin!=='upload'||previous.id!==draft.id||previous.source.brandKey!==draft.source.brandKey)throw new PublishingStateError('Nur eine eigene Upload-Planung derselben Marke kann ersetzt werden.');
  if(previous.status==='published'||previous.lease||previous.process.publishStartedAt)throw new PublishingStateError('Dieser Veröffentlichungsversuch kann nicht mehr ersetzt werden. Legen Sie bei Bedarf eine neue Planung an.');
  return change(previous,{...draft,connectionMode:draft.connectionMode,status:effectiveDelivery(draft)==='manual'?'manual_planned':'prepared',media,approval:null,manualCompletion:null,generation:previous.generation+1,process:idle(),nextActionAt:null,lease:null},at);
 }
 const fresh=newPublication(draft,at);return publicationRecordSchema.parse({...fresh,status:effectiveDelivery(fresh)==='manual'?'manual_planned':'prepared',media});
}
export function savePublication(previous:PublicationRecord,input:PublicationDraft,at:string):PublicationRecord{
 if(previous.status==='published'||previous.lease||previous.process.publishStartedAt)throw new PublishingStateError('Dieser Veröffentlichungsversuch kann nicht mehr bearbeitet werden. Legen Sie bei Bedarf eine neue Planung an.');
 const draft=publicationDraftSchema.parse({...input,...(input.platform===undefined&&previous.platform!==undefined?{platform:previous.platform}:{}),...(input.delivery===undefined&&previous.delivery!==undefined?{delivery:previous.delivery}:{}),...(input.targetLabel===undefined&&previous.targetLabel!==undefined?{targetLabel:previous.targetLabel}:{})});assertPlanningDraft(draft);if(draft.id!==previous.id)throw new PublishingStateError('Die Planung stimmt nicht überein.');
 const keepMedia=previous.source.snapshotHash===draft.source.snapshotHash&&previous.kind===draft.kind&&previous.slideIndex===draft.slideIndex&&Boolean(previous.carousel)===Boolean(draft.carousel);
 return change(previous,{...draft,connectionMode:draft.connectionMode,status:effectiveDelivery(draft)==='manual'?'manual_planned':keepMedia&&previous.media?'prepared':'draft',media:keepMedia?previous.media:null,mediaItems:keepMedia&&draft.carousel?previous.mediaItems:undefined,approval:null,manualCompletion:null,generation:previous.generation+1,process:idle(),nextActionAt:null,lease:null},at);
}
export function preparePublication(previous:PublicationRecord,input:PublishingMedia,at:string):PublicationRecord{
 if(previous.carousel)throw new PublishingStateError('Bitte alle Carousel-Folien über die Bildfolge vorbereiten.');
 if(effectiveDelivery(previous)==='manual'||previous.kind==='text'||isReferenceSource(previous.source))throw new PublishingStateError('Bitte eine automatische Planung mit eigenen Medien wählen.');
 if(previous.status==='published'||previous.lease||previous.process.publishStartedAt)throw new PublishingStateError('Dieser Versuch kann nicht neu vorbereitet werden.');
 const media=publishingMediaSchema.parse(input);if(media.sourceHash!==previous.source.snapshotHash||media.kind!==previous.kind||media.slideIndex!==previous.slideIndex)throw new PublishingStateError('Die Medien gehören zu einem anderen Entwurfsstand. Bitte neu vorbereiten.');
 return change(previous,{media,status:'prepared',approval:null,manualCompletion:null,generation:previous.generation+1,process:idle(),nextActionAt:null,lease:null},at);
}
export function approvePublication(previous:PublicationRecord,input:{by:string;contentHash:string;connectionGeneration:number},at:string):PublicationRecord{
 assertAutomaticPublication(previous);
 if(!['prepared','cancelled','failed'].includes(previous.status)||!previous.media||!previous.accountId||!previous.scheduledAt||previous.process.publishStartedAt)throw new PublishingStateError('Bitte zuerst Konto, Zeitpunkt und geprüfte Medien vollständig vorbereiten.');
 const lead=previous.kind==='reel'?15*60000:2*60000;if(Date.parse(previous.scheduledAt)<Date.parse(at)+lead)throw new PublishingStateError(previous.kind==='reel'?'Reels brauchen mindestens 15 Minuten Vorlauf. Bitte einen späteren Zeitpunkt wählen.':'Bitte mindestens zwei Minuten Vorlauf einplanen.');
 return change(previous,{status:'scheduling',generation:previous.generation+1,approval:{...input,at,mediaHash:previous.media.sha256},manualCompletion:null,process:{...idle(),phase:'create'},nextActionAt:preparationTime(previous.kind==='reel'?'reel':'image',previous.scheduledAt),lease:null},at);
}
export function completeManualPublication(previous:PublicationRecord,by:string,at:string):PublicationRecord{
 if(effectiveDelivery(previous)!=='manual'||previous.status==='published'||previous.lease||previous.process.publishStartedAt||!['manual_planned','manual_completed','draft'].includes(previous.status))throw new PublishingStateError('Nur eine manuelle Planung kann ausdrücklich als erledigt markiert werden.');
 assertPlanningDraft(previous);
 if(previous.status==='manual_completed')throw new PublishingStateError('Diese manuelle Planung ist bereits erledigt. Bitte den aktuellen Stand laden.');
 return change(previous,{status:'manual_completed',manualCompletion:{by,at},approval:null,generation:previous.generation+1,process:idle(),nextActionAt:null,lease:null},at);
}
export function reopenManualPublication(previous:PublicationRecord,at:string):PublicationRecord{
 if(effectiveDelivery(previous)!=='manual'||!['manual_completed','cancelled'].includes(previous.status)||previous.lease||previous.process.publishStartedAt)throw new PublishingStateError('Nur eine erledigte oder gestoppte manuelle Planung kann erneut geöffnet werden.');
 assertPlanningDraft(previous);return change(previous,{status:'manual_planned',manualCompletion:null,approval:null,generation:previous.generation+1,process:idle(),nextActionAt:null,lease:null},at);
}
export function cancelPublication(previous:PublicationRecord,at:string):PublicationRecord{
 if(previous.status==='published'||previous.status==='awaiting_platform')throw new PublishingStateError('Ein bereits veröffentlichter oder an die App übergebener Beitrag kann hier nicht zurückgenommen werden.');
 if(previous.process.publishStartedAt&&previous.status==='processing')throw new PublishingStateError('Instagram verarbeitet die Veröffentlichung bereits. Bitte zuerst den Status prüfen.');
 return change(previous,{status:'cancelled',generation:previous.generation+1,approval:null,manualCompletion:null,lease:null,nextActionAt:null,process:{...previous.process,phase:previous.process.publishStartedAt?'review':'idle',lastError:previous.process.publishStartedAt?'Der unklare Versuch wurde beendet. Bitte prüfen Sie den Beitrag zusätzlich in Instagram.':null}},at);
}
export function pausePublication(previous:PublicationRecord,reason:string,at:string){if(['published','cancelled','needs_review'].includes(previous.status))return previous;return change(previous,{status:'needs_review',generation:previous.generation+1,approval:null,lease:null,nextActionAt:null,process:{...previous.process,phase:'review',lastError:reason.slice(0,500)}},at);}
export function markQueued(previous:PublicationRecord,generation:number,at:string){if(!isAutomaticInstagram(previous)||isReferenceSource(previous.source)||previous.kind==='text'||previous.generation!==generation||!previous.approval)return previous;return previous.status==='scheduling'?change(previous,{status:'scheduled'},at):previous;}
export function claimPublication(previous:PublicationRecord,generation:number,token:string,at:string,leaseMs=90000):PublicationRecord|null{
 if(!isAutomaticInstagram(previous)||isReferenceSource(previous.source)||previous.kind==='text'||previous.generation!==generation||!previous.approval||!previous.nextActionAt||!['scheduling','scheduled','processing'].includes(previous.status))return null;
 if(previous.lease&&Date.parse(previous.lease.until)>Date.parse(at))return null;
 if(previous.process.publishStartedAt)return pausePublication(previous,'Die letzte Veröffentlichung ist nicht eindeutig bestätigt. Bitte den Instagram-Status prüfen.',at);
 if(Date.parse(previous.nextActionAt)>Date.parse(at)+1000)return null;
 if(previous.scheduledAt&&Date.parse(at)-Date.parse(previous.scheduledAt)>15*60000)return pausePublication(previous,'Der geplante Zeitpunkt liegt zu weit zurück. Bitte prüfen und mit einem neuen Zeitpunkt erneut freigeben.',at);
 return change(previous,{status:'processing',lease:{token,until:new Date(Date.parse(at)+leaseMs).toISOString()}},at);
}
function leased(previous:PublicationRecord,generation:number,token:string){assertAutomaticPublication(previous);if(previous.generation!==generation||previous.lease?.token!==token||!previous.approval)throw new PublishingStateError('Dieser Verarbeitungsschritt ist inzwischen veraltet.');}
export function checkpointPublication(previous:PublicationRecord,generation:number,token:string,patch:Partial<PublicationRecord['process']>,nextActionAt:string|null,at:string):PublicationRecord{leased(previous,generation,token);return change(previous,{status:'scheduled',process:{...previous.process,...patch},nextActionAt,lease:null},at);}
export function beginPublish(previous:PublicationRecord,generation:number,token:string,at:string){leased(previous,generation,token);if(previous.process.phase!=='publish'||!previous.process.containerId)throw new PublishingStateError('Der Instagram-Container ist noch nicht bereit.');return change(previous,{process:{...previous.process,publishStartedAt:at}},at);}
export function confirmPublication(previous:PublicationRecord,generation:number,token:string|null,mediaId:string|null,at:string){assertAutomaticPublication(previous);if(token)leased(previous,generation,token);else if(previous.generation!==generation||previous.status!=='needs_review')throw new PublishingStateError('Dieser Status wurde inzwischen geändert.');return change(previous,{status:'published',process:{...previous.process,phase:'done',mediaId,confirmedAt:at,lastError:null},lease:null,nextActionAt:null},at);}
export function failPublication(previous:PublicationRecord,generation:number,token:string,reason:string,ambiguous:boolean,at:string){leased(previous,generation,token);return change(previous,{status:ambiguous?'needs_review':'failed',process:{...previous.process,phase:ambiguous?'review':previous.process.phase,lastError:reason.slice(0,500)},lease:null,nextActionAt:null},at);}

export function prepareCarouselItem(previous:PublicationRecord,input:PublishingMedia,at:string):PublicationRecord{
 const media=publishingMediaSchema.parse(input);assertPlanningDraft(previous);
 if(!previous.carousel||previous.delivery!=='automatic'||previous.lease||previous.process.publishStartedAt||!['draft','prepared','cancelled','failed'].includes(previous.status)||media.kind!=='image'||media.mimeType!=='image/jpeg'||media.sourceHash!==previous.source.snapshotHash||media.slideIndex>=previous.source.slides)throw new PublishingStateError('Diese Folie passt nicht zum gespeicherten Carousel.');
 const others=(previous.mediaItems??[]).filter(item=>item.slideIndex!==media.slideIndex);
 if(others.some(item=>item.width!==media.width||item.height!==media.height||item.id===media.id))throw new PublishingStateError('Alle Carousel-Bilder müssen dasselbe Format und eigene Medienkennungen haben.');
 const mediaItems=[...others,media].sort((a,b)=>a.slideIndex-b.slideIndex),cover=mediaItems.find(item=>item.slideIndex===0)??null;
 const candidate={...previous,media:cover,mediaItems};
 return change(previous,{media:cover,mediaItems,status:carouselItemsReady(candidate)?'prepared':'draft',approval:null,generation:previous.generation+1,manualCompletion:null,lease:null,nextActionAt:null,process:idle()},at);
}
