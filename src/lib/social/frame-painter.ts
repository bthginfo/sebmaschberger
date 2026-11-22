import { drawFrame,drawSlide,slideAt,type RenderResources } from './render';
import { formatOf,type SocialProject } from './model';
import { createVideoFrames,type SlideVideoFrames } from './video-frames';

export async function videoFramesAt(decoder:ReturnType<typeof createVideoFrames>,project:SocialProject,timeMs:number){
 const active=slideAt(project,timeMs),frames=new Map<string,SlideVideoFrames>();
 const back=active.index>0&&active.slide.transition!=='none'&&active.time<active.slide.transitionMs?project.slides[active.index-1]:null;
 await Promise.all([
  decoder.sampleSlide(active.slide,active.time).then(value=>frames.set(active.slide.id,value)),
  back?decoder.sampleSlide(back,back.durationMs).then(value=>frames.set(back.id,value)):undefined,
 ]);
 return frames;
}

type Frame={ctx:CanvasRenderingContext2D;project:SocialProject;index:number;timeMs:number;playing:boolean;resources:RenderResources;ready:()=>boolean;error:(reason:unknown)=>void};
export function createStudioFramePainter(){
 let next:Frame|undefined,painting=false,disposed=false;
 const decoder=createVideoFrames();
 function draw(value:Frame,activeFrames?:Map<string,SlideVideoFrames>){
  if(disposed||!value.ready())return;
  const {ctx,project,index,timeMs,playing,resources}=value,{width,height}=formatOf(project);
  if(ctx.canvas.width!==width)ctx.canvas.width=width;
  if(ctx.canvas.height!==height)ctx.canvas.height=height;
  if(playing)drawFrame(ctx,project,timeMs,resources,activeFrames);
  else{
   const slide=project.slides[index]??project.slides[0];
   ctx.clearRect(0,0,width,height);
   drawSlide(ctx,slide,width,height,resources,{videoFrames:activeFrames?.get(slide.id)});
  }
 }
 async function run(){
  if(painting)return;
  painting=true;
  try{
   while(next&&!disposed){
    const value=next;next=undefined;
    if(!value.ready())continue;
    const {project,index,timeMs,playing}=value;
    const slide=project.slides[index]??project.slides[0];
    try{
     if(playing)draw(value,await videoFramesAt(decoder,project,timeMs));
     else{
      const local=Math.max(0,Math.min(slide.durationMs,timeMs-project.slides.slice(0,index).reduce((sum,item)=>sum+item.durationMs,0)));
      draw(value,new Map([[slide.id,await decoder.sampleSlide(slide,local)]]));
     }
    }catch(error){if(!disposed&&value.ready()){draw(value);value.error(error);}}
   }
  }finally{painting=false;}
 }
 return {
  paint(value:Frame){
   if(disposed)return;
   if(!value.project.slides.some(slide=>slide.elements.some(item=>item.type==='video'&&!item.hidden))){
    next=undefined;draw(value);return;
   }
   next=value;void run();
  },
  dispose(){disposed=true;next=undefined;decoder.dispose();},
 };
}
