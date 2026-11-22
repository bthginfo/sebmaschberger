import 'server-only';
import {AppError,getDraftConfig,getRecord,getSettings,listRecords,mutateRecord} from '@/lib/db';
import {getSeedProjects} from '@/lib/social/catalog';
import {projectSchema,type SocialSnapshot} from '@/lib/social/model';
import type {StudioPublicationSource,PlannerReadiness} from '@/lib/social/publishing/model';
import {loadSocialProject,readSocialBrand} from '@/lib/server/social/store';
import type {SocialProjectRecord} from '@/lib/server/social/state';
import {projectSnapshot} from '@/lib/server/social/state';
import {publishingHash,type PublishingRepository,type StoredPublication,type StoredConnection,type StoredPublishingMedia} from './types';

export const PUBLICATIONS='social-publications',CONNECTIONS='social-publishing-connections',PUBLISHING_MEDIA='social-publishing-media';
export async function publishingEnabled(){const config=await getDraftConfig();return config.modules?.socialStudio?.enabled===true&&config.modules?.socialPublishing?.enabled===true;}
export async function requirePublishingEnabled(){if(!await publishingEnabled())throw new AppError('Der Post-Planer ist nicht aktiviert. Aktivieren und speichern Sie Social-Studio und Post-Planer unter Einstellungen.',403);}
export function sourceOf(snapshot:SocialSnapshot):StudioPublicationSource{const project=projectSchema.parse(snapshot.project);return{projectId:project.id,projectRevision:snapshot.revision,title:project.title,brandKey:'default',brandLabel:project.brand.name,formatId:project.formatId,kind:project.kind,slides:project.slides.length,snapshotHash:publishingHash(project)};}
async function sources(){
 const[records,brand]=await Promise.all([listRecords<SocialProjectRecord>('social-projects'),readSocialBrand()]);
 const snapshots=records.filter(record=>record.project&&!record.archived).map(projectSnapshot),saved=new Set(records.filter(record=>record.project).map(record=>record.project!.id));
 for(const project of getSeedProjects(brand.brand))if(!saved.has(project.id))snapshots.push({project,revision:0,updatedAt:null});
 return snapshots.map(sourceOf);
}
export const publishingRepository:PublishingRepository={
 epoch:async()=>{const control=await getRecord<{epoch:number}>('social-publishing-control','main');return control?.epoch??0;},
 publication:id=>getRecord<StoredPublication>(PUBLICATIONS,id),publications:()=>listRecords<StoredPublication>(PUBLICATIONS),
 mutatePublication:(id,update)=>mutateRecord<StoredPublication|null>(PUBLICATIONS,id,null,update) as Promise<StoredPublication>,
 connection:id=>getRecord<StoredConnection>(CONNECTIONS,id),connections:()=>listRecords<StoredConnection>(CONNECTIONS),
 mutateConnection:(id,update)=>mutateRecord<StoredConnection|null>(CONNECTIONS,id,null,update) as Promise<StoredConnection>,
  source:async id=>{const snapshot=await loadSocialProject(id);return{source:sourceOf(snapshot),project:projectSchema.parse(snapshot.project)};},sources,referenceBrandLabel:async()=>(await readSocialBrand()).brand.name
};
export async function publicPublishingOrigin(){
 const settings=await getSettings();try{const url=new URL(settings.siteUrl);if(url.protocol!=='https:'||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash||url.hostname==='localhost'||url.hostname.endsWith('.local')||/^(?:\d{1,3}\.){3}\d{1,3}$/.test(url.hostname)||url.hostname.includes(':'))return null;return url.origin;}catch{return null;}
}
export function publishingSecretReady(){return Boolean(process.env.AUTH_SECRET&&process.env.AUTH_SECRET.length>=32);}
export async function plannerReadiness():Promise<PlannerReadiness>{
 const enabled=await publishingEnabled();if(!enabled)return{enabled:false,queue:false,media:false,publicOrigin:false,messages:['Der Post-Planer ist ausgeschaltet.']};
 const queue=process.env.SOCIAL_PUBLISHING_QUEUE_ENABLED==='1'&&process.env.VERCEL==='1',media=process.env.VERCEL!=='1'||Boolean(process.env.PRIVATE_SOCIAL_BLOB_READ_WRITE_TOKEN),origin=Boolean(await publicPublishingOrigin()),credentials=publishingSecretReady();
 return{enabled,queue,media,publicOrigin:origin,credentials,messages:[...(!queue?['Automatisches Senden ist noch aus. Dafür müssen die Vercel-Warteschlange und ihr geschützter Empfänger eingerichtet werden.']:[]),...(!media?['Der eigene private Social-Medienspeicher fehlt.']:[]),...(!origin?['Für den Versand wird eine eigene öffentliche HTTPS-Adresse benötigt. Speichern Sie diese unter Einstellungen → Allgemein → Website-Adresse.']:[]),...(!credentials?['Die verschlüsselte Zugangsspeicherung und geschützte Medienfreigabe müssen vom Betreiber auf dem Server eingerichtet werden.']:[])]};
}
export const readStoredPublishingMedia=(id:string)=>getRecord<StoredPublishingMedia>(PUBLISHING_MEDIA,id);
