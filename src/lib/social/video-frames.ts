import type { CanvasSink,Input,WrappedCanvas } from 'mediabunny';
import { type SocialSlide } from './model';
import { VIDEO_PREFIX,videoId } from './video-model';

export type VideoFrame={canvas:HTMLCanvasElement|OffscreenCanvas;width:number;height:number};
export type SlideVideoFrames=Map<string,VideoFrame>;
type Clip={input:Input;sink:CanvasSink;first:number;end:number;next?:WrappedCanvas;current?:WrappedCanvas;cursor?:AsyncGenerator<WrappedCanvas,void,unknown>;at?:number;done?:boolean};

async function openClip(source:string,maxSide:number):Promise<Clip>{
 const id=videoId(source);
 if(!id)throw new Error('Das Studio-Video hat eine ungültige Quelle.');
 const media=await import('mediabunny');
 const input=new media.Input({source:new media.UrlSource(new URL(VIDEO_PREFIX+id,location.origin),{maxCacheSize:12*1024*1024}),formats:[media.MP4,media.WEBM]});
 try{
  const track=await input.getPrimaryVideoTrack();
  if(!track||!await track.canDecode())throw new Error('Dieses Video kann im aktuellen Browser nicht abgespielt werden.');
  const [first,end,width,height]=await Promise.all([track.getFirstTimestamp(),track.computeDuration(),track.getDisplayWidth(),track.getDisplayHeight()]);
  if(!(end>first))throw new Error('Die Videodauer ist ungültig.');
  const scale=Math.min(1,maxSide/Math.max(width,height));
  return {input,first,end,sink:new media.CanvasSink(track,{poolSize:4,width:Math.max(2,Math.round(width*scale)),height:Math.max(2,Math.round(height*scale)),fit:'fill'})};
 }catch(error){input.dispose();throw error;}
}
async function sample(clip:Clip,timeMs:number):Promise<VideoFrame|undefined>{
 const time=Math.min(clip.end-.001,clip.first+Math.max(0,timeMs)/1000);
 if(!clip.cursor||clip.at===undefined||time<clip.at-.002||time-clip.at>.6){
  await clip.cursor?.return(undefined);
  const exact=await clip.sink.getCanvas(time);
  clip.current=exact??undefined;
  clip.next=undefined;clip.done=false;
  clip.cursor=clip.sink.canvases(exact?exact.timestamp+.000001:clip.first);
 }
 clip.at=time;
 while(!clip.done&&(!clip.next||clip.next.timestamp<=time)){
  if(clip.next)clip.current=clip.next;
  const next=await clip.cursor.next();
  clip.next=next.done?undefined:next.value;
  clip.done=Boolean(next.done);
 }
 const frame=clip.current??clip.next;
 return frame?{canvas:frame.canvas,width:frame.canvas.width,height:frame.canvas.height}:undefined;
}
function dispose(clip:Clip){
 void clip.cursor?.return(undefined).catch(()=>{});
 clip.input.dispose();
}
export function createVideoFrames(maxSide=1440){
 const sessions=new Map<string,Promise<Clip>>();
 let closed=false;
 function acquire(key:string,src:string){
  let clip=sessions.get(key);
  if(clip)sessions.delete(key);
  else clip=openClip(src,maxSide);
  sessions.set(key,clip);
  if(sessions.size>6){
   const first=sessions.keys().next().value!;
   const previous=sessions.get(first)!;sessions.delete(first);
   void previous.then(dispose,()=>{});
  }
  return clip;
 }
 async function sampleSlide(slide:SocialSlide,timeMs:number):Promise<SlideVideoFrames>{
  const visible=slide.elements.filter(item=>item.type==='video'&&!item.hidden&&item.src).slice(0,2);
  if(closed||!visible.length)return new Map();
  const result=await Promise.all(visible.map(async element=>{
   const key=slide.id+'/'+element.id+'/'+element.src;
   const clip=await acquire(key,element.src!);
   if(closed)return null;
   const frame=await sample(clip,timeMs+(element.clipStartMs??0));
   return frame?[element.id,frame] as const:null;
  }));
  return new Map(result.filter(entry=>entry!==null));
 }
 return {sampleSlide,dispose(){
  closed=true;
  for(const clip of sessions.values())void clip.then(dispose,()=>{});
  sessions.clear();
 }};
}
