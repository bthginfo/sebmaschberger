import { formatOf, durationOf, type SocialProject } from './model';
import { drawFrame, drawSlide, prepareProject } from './render';

import {createVideoFrames} from './video-frames';
import {videoFramesAt} from './frame-painter';

export type ExportProgress={fraction:number;label:string};
type ExportOptions={signal?:AbortSignal;onProgress?:(progress:ExportProgress)=>void};
export function safeFilename(value:string){return value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-|-$/g,'').slice(0,90)||'Social-Design';}
export function downloadBlob(blob:Blob,filename:string){const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function canvasFor(project:SocialProject){const {width,height}=formatOf(project);const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)throw new Error('Die Zeichenfläche konnte nicht geöffnet werden. Bitte die Seite neu laden.');return{canvas,ctx,width,height};}
function abort(signal?:AbortSignal){if(signal?.aborted)throw new DOMException('Der Export wurde abgebrochen.','AbortError');}
export async function imageBlob(project:SocialProject,index:number,format:'png'|'jpeg'='png',transparent=false):Promise<Blob>{
 const resources=await prepareProject(project);const {canvas,ctx,width,height}=canvasFor(project);
 if(format==='jpeg'){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);}
 const decoder=createVideoFrames();
 try{const slide=project.slides[index];drawSlide(ctx,slide,width,height,resources,{transparent:transparent&&format==='png',videoFrames:await decoder.sampleSlide(slide,0)});}
 finally{decoder.dispose();}
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Das Bild konnte nicht exportiert werden. Bitte erneut versuchen.')),'image/'+format,.96));canvas.width=1;canvas.height=1;return blob;
}
export async function videoBlob(project:SocialProject,options:ExportOptions={}):Promise<{blob:Blob;extension:'mp4'|'webm'}>{
 if(durationOf(project)>90000)throw new Error('Ein Video darf hier höchstens 90 Sekunden lang sein. Kürzen Sie die Slides oder exportieren Sie die Bilder einzeln.');
 abort(options.signal);options.onProgress?.({fraction:0,label:'Schriften und Medien laden'});
 const resources=await prepareProject(project);abort(options.signal);
 const media=await import('mediabunny');const {canvas,ctx,width,height}=canvasFor(project);const frameRate=30;
 const avc=await media.canEncodeVideo('avc',{width,height,frameRate,quality:media.QUALITY_HIGH});
 const codec=avc?'avc':await media.canEncodeVideo('vp9',{width,height,frameRate})?'vp9':await media.canEncodeVideo('vp8',{width,height,frameRate})?'vp8':null;
 if(!codec){canvas.width=1;canvas.height=1;throw new Error('Dieser Browser kann hier kein Video erstellen. Bitte den Entwurf in einem aktuellen Chrome, Edge oder Safari öffnen. Bild- und Projekt-Export bleiben verfügbar.');}
 const extension=avc?'mp4':'webm';const target=new media.BufferTarget();const output=new media.Output({target,format:avc?new media.Mp4OutputFormat({fastStart:'in-memory'}):new media.WebMOutputFormat()});
 const source=new media.CanvasSource(canvas,{codec,quality:media.QUALITY_HIGH,keyFrameInterval:2,latencyMode:'quality'});output.addVideoTrack(source,{frameRate});
 const decoder=createVideoFrames();
 const hasClips=project.slides.some(slide=>slide.elements.some(item=>item.type==='video'&&!item.hidden));
 let started=false;
 try{
  await output.start();started=true;
  const frames=Math.ceil(durationOf(project)/1000*frameRate);
  for(let frame=0;frame<frames;frame++){
   abort(options.signal);const time=frame/frameRate*1000;drawFrame(ctx,project,time,resources,hasClips?await videoFramesAt(decoder,project,time):undefined);await source.add(frame/frameRate,1/frameRate);
   if(frame%10===0){options.onProgress?.({fraction:frame/frames,label:`${extension.toUpperCase()} · ${Math.round(frame/frames*100)} %`});await new Promise(resolve=>setTimeout(resolve,0));}
  }
  source.close();await output.finalize();abort(options.signal);
  if(!target.buffer)throw new Error('Die Videodatei ist leer. Bitte erneut exportieren.');
  options.onProgress?.({fraction:1,label:`${extension.toUpperCase()} ist bereit`});
  return{blob:new Blob([target.buffer],{type:avc?'video/mp4':'video/webm'}),extension};
 }catch(error){if(started)await output.cancel().catch(()=>{});throw error;}finally{decoder.dispose();canvas.width=1;canvas.height=1;}
}
export async function exportImages(project:SocialProject,options:ExportOptions&{format?:'png'|'jpeg';transparent?:boolean}={}){
 const format=options.format||'png';if(project.slides.length===1){abort(options.signal);const blob=await imageBlob(project,0,format,options.transparent);abort(options.signal);downloadBlob(blob,safeFilename(project.title)+'.'+(format==='jpeg'?'jpg':'png'));return;}
 await exportBundle([project],{...options,includeVideo:false,imageFormat:format,transparent:options.transparent,filename:safeFilename(project.title)});
}
export async function exportBundle(projects:SocialProject[],options:ExportOptions&{includeVideo?:boolean;imageFormat?:'png'|'jpeg';transparent?:boolean;filename?:string}={}){
 const {Zip,ZipPassThrough,strToU8}=await import('fflate');const parts:Uint8Array<ArrayBuffer>[]=[];let archiveError:Error|undefined;
 const zip=new Zip((error,chunk)=>{if(error)archiveError=error;else parts.push(new Uint8Array(chunk));});
 const add=(name:string,bytes:Uint8Array)=>{abort(options.signal);const file=new ZipPassThrough(name);zip.add(file);file.push(bytes,true);if(archiveError)throw archiveError;};
 try{
  for(let index=0;index<projects.length;index++){
   abort(options.signal);const project=projects[index],folder=safeFilename(project.brand.name)+'/'+String(index+1).padStart(2,'0')+'-'+safeFilename(project.title);
   const progress=(fraction:number,label:string)=>options.onProgress?.({fraction:(index+fraction)/projects.length,label:`${index+1} / ${projects.length} · ${label}`});
   add(folder+'/caption.txt',strToU8(project.caption));add(folder+'/projekt.social.json',strToU8(JSON.stringify(project,null,2)));
   if(project.kind==='reel'&&options.includeVideo!==false){
    const video=await videoBlob(project,{signal:options.signal,onProgress:value=>progress(value.fraction,value.label)});abort(options.signal);add(folder+'/reel.'+video.extension,new Uint8Array(await video.blob.arrayBuffer()));
   }else{
    for(let slide=0;slide<project.slides.length;slide++){
     progress(slide/project.slides.length,project.title);const blob=await imageBlob(project,slide,options.imageFormat||'png',options.transparent);add(folder+'/slide-'+String(slide+1).padStart(2,'0')+'.'+(options.imageFormat==='jpeg'?'jpg':'png'),new Uint8Array(await blob.arrayBuffer()));
    }
   }
   await new Promise(resolve=>setTimeout(resolve,0));
  }
  abort(options.signal);zip.end();if(archiveError)throw archiveError;
  downloadBlob(new Blob(parts,{type:'application/zip'}),(options.filename||'Social-Studio')+'.zip');options.onProgress?.({fraction:1,label:'ZIP ist bereit'});
 }catch(error){zip.terminate();throw error;}
}
