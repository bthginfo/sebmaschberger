import 'server-only';
import {access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {AppError,getDraftConfig,getRecord,getSettings,listMedia,listRecords,mutateRecord} from '@/lib/db';
import type {MediaAsset,SiteConfig} from '@/lib/types';
import {archiveSchema,brandSchema,brandSaveSchema,idSchema,projectSchema,saveSchema,summarize,type SocialAsset,type SocialBrandProfile,type SocialProject,type SocialSnapshot,type SocialWorkspace} from '@/lib/social/model';
import {getSeedProject,getSeedProjects} from '@/lib/social/catalog';
import {archiveProjectState,emptyBrand,emptyProject,projectSnapshot,saveBrandState,saveProjectState,SocialStateError,type SocialBrandRecord,type SocialProjectRecord} from './state';

import {VIDEO_COLLECTION,videoAssetView,videoId,type VideoAsset} from '@/lib/social/video-model';

export async function requireSocialEnabled():Promise<SiteConfig> {
 const config=await getDraftConfig();if(!config.modules?.socialStudio?.enabled)throw new AppError('Das Social-Studio ist für diese Website nicht aktiviert. Aktivieren und speichern Sie es unter Einstellungen.',403);
 return config;
}
function initialBrand(config:SiteConfig,siteUrl:string):SocialBrandProfile {
 const color=(value:string,fallback:string)=>/^#(?:[a-f0-9]{3}|[a-f0-9]{4}|[a-f0-9]{6}|[a-f0-9]{8})$/i.test(value)?value:fallback;
 const ink=color(config.theme.primary,'#183c32');let paper=color(config.theme.background,'#f5f2e9');
 const luminance=(hex:string)=>{let digits=hex.slice(1);if(digits.length<=4)digits=digits.slice(0,3).split('').map(value=>value+value).join('');const channels=[0,2,4].map(index=>parseInt(digits.slice(index,index+2),16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;};
 const a=luminance(ink),b=luminance(paper);if((Math.max(a,b)+.05)/(Math.min(a,b)+.05)<4.5)paper=a>.5?'#142d24':'#f5f2e9';
 return{name:config.name.trim()||'Ihre Marke',website:/^https?:\/\//i.test(siteUrl)?siteUrl:'',accent:color(config.theme.accent,'#d08b63'),ink,paper,headlineFont:config.theme.font==='dm-sans'?'dm-sans':'manrope',bodyFont:'dm-sans'};
}
export async function readSocialBrand(config?:SiteConfig):Promise<{brand:SocialBrandProfile;revision:number}> {
 const [record,settings]=await Promise.all([getRecord<SocialBrandRecord>('social-brand','default'),getSettings()]);
 return{brand:record?.brand?brandSchema.parse(record.brand):initialBrand(config??await requireSocialEnabled(),settings.siteUrl),revision:record?.revision??0};
}
export async function assertSocialSources(project:Pick<SocialProject,'brand'|'slides'>) {
 for(const slide of project.slides)for(const element of slide.elements)if(element.type==='video'){
  const id=videoId(element.src??''),asset=id?await getRecord<VideoAsset>(VIDEO_COLLECTION,id):null;
  if(!asset||(element.clipStartMs??0)>=asset.durationMs)throw new AppError('Ein Studio-Video oder sein Startpunkt ist nicht verfügbar. Prüfen Sie den Clip in der Mediathek.',409);
 }
 const sources=new Set([...(project.brand.logoSrc?[project.brand.logoSrc]:[]),...project.slides.flatMap(slide=>slide.elements.flatMap(element=>element.type==='image'&&element.src?[element.src]:[]))]);
 for(const source of sources){
  if(source.startsWith('/api/admin/social/assets/')){const asset=await getRecord('social-assets',source.slice('/api/admin/social/assets/'.length));if(!asset)throw new AppError('Ein verwendetes Bild fehlt in Ihrer Social-Mediathek.',409);}
  else if(source.startsWith('/api/admin/social/media/')){const media=await getRecord<MediaAsset>('media',source.slice('/api/admin/social/media/'.length));if(!media||!media.type.startsWith('image/'))throw new AppError('Ein verwendetes Bild fehlt in Ihrer Website-Mediathek.',409);}
  else if(/^\/social-studio\/[a-zA-Z0-9_-]+\.(?:svg|png|webp)$/.test(source)){try{await access(resolve(process.cwd(),'public',source.slice(1)));}catch{throw new AppError('Ein verwendetes Vorlagenbild ist nicht verfügbar.',409);}}
  else throw new AppError('Bitte verwenden Sie Bilder aus Ihrer eigenen Mediathek.');
 }
}
async function mapped<T>(work:()=>Promise<T>):Promise<T>{try{return await work();}catch(error){if(error instanceof SocialStateError)throw new AppError(error.message,error.status);throw error;}}
export function socialAssetView(record:SocialAsset):SocialAsset {return{id:record.id,name:record.name,src:'/api/admin/social/assets/'+record.id,width:record.width,height:record.height,mimeType:record.mimeType,createdAt:record.createdAt};}
export async function loadSocialWorkspace():Promise<SocialWorkspace> {
 const config=await requireSocialEnabled();
 const [brandInfo,records,assets,media,videos]=await Promise.all([readSocialBrand(config),listRecords<SocialProjectRecord>('social-projects'),listRecords<SocialAsset>('social-assets'),listMedia(),listRecords<VideoAsset>(VIDEO_COLLECTION)]);
 const saved=new Map(records.filter(record=>record.project).map(record=>[record.project!.id,record]));
 const snapshots=records.filter(record=>record.project&&!record.archived).map(projectSnapshot);
 for(const template of getSeedProjects(brandInfo.brand))if(!saved.has(template.id))snapshots.push({project:projectSchema.parse(template),revision:0,updatedAt:null});
 return{projects:snapshots.map(summarize),assets:[...videos.map(videoAssetView),...assets.map(socialAssetView)],media:media.filter(asset=>asset.type.startsWith('image/')).map(asset=>({id:asset.id,name:asset.name,src:'/api/admin/social/media/'+asset.id,width:asset.width??0,height:asset.height??0,mimeType:asset.type,createdAt:asset.createdAt})),brand:brandInfo.brand,brandRevision:brandInfo.revision,initial:snapshots[0]??null};
}
export async function loadSocialProject(id:string):Promise<SocialSnapshot> {
 const config=await requireSocialEnabled();idSchema.parse(id);
 const record=await getRecord<SocialProjectRecord>('social-projects',id);
 if(record)return mapped(async()=>projectSnapshot(record));
 const {brand}=await readSocialBrand(config),template=getSeedProject(id,brand);if(!template)throw new AppError('Dieser Entwurf wurde nicht gefunden.',404);
 return{project:template,revision:0,updatedAt:null};
}
export async function saveSocialProject(input:unknown):Promise<SocialSnapshot> {
 await requireSocialEnabled();const data=saveSchema.parse(input);await assertSocialSources(data.project);const at=new Date().toISOString();
 return mapped(async()=>projectSnapshot(await mutateRecord('social-projects',data.project.id,emptyProject(),previous=>saveProjectState(previous,data,at))));
}
export async function archiveSocialProject(input:unknown) {
 await requireSocialEnabled();const data=archiveSchema.parse(input),at=new Date().toISOString();
 await mapped(async()=>mutateRecord('social-projects',data.id,emptyProject(),previous=>archiveProjectState(previous,data,at)));
 return{id:data.id,archived:true};
}
export async function saveSocialBrand(input:unknown) {
 await requireSocialEnabled();const data=brandSaveSchema.parse(input);await assertSocialSources({brand:data.brand,slides:[]});const at=new Date().toISOString();
 const record=await mapped(async()=>mutateRecord('social-brand','default',emptyBrand(),previous=>saveBrandState(previous,data,at)));
 return{brand:record.brand!,revision:record.revision};
}
