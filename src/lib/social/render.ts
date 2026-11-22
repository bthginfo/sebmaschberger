import { formatOf, type SocialElement, type SocialProject, type SocialSlide, type SocialBrandProfile } from './model';
import { familyOf, loadProjectFonts } from './fonts';

import type {SlideVideoFrames,VideoFrame} from './video-frames';

export type RenderResources={images:Map<string,HTMLImageElement>;brand:SocialBrandProfile};
const images=new Map<string,Promise<HTMLImageElement>>();
export function loadImage(src:string):Promise<HTMLImageElement>{
 let work=images.get(src);if(work)return work;
 work=new Promise((resolve,reject)=>{const image=new Image();image.decoding='async';image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Ein Bild konnte nicht geladen werden. Bitte das Bild in der Mediathek prüfen.'));image.src=src;});
 images.set(src,work);work.catch(()=>images.delete(src));return work;
}
export async function prepareProject(project:SocialProject):Promise<RenderResources>{
 const sources=new Set(project.slides.flatMap(slide=>slide.elements.filter(element=>element.type==='image').map(element=>element.src!)));
 if(project.brand.logoSrc)sources.add(project.brand.logoSrc);
 const [loaded]=await Promise.all([Promise.all([...sources].map(async src=>[src,await loadImage(src)] as const)),loadProjectFonts(project)]);
 return{images:new Map(loaded),brand:structuredClone(project.brand)};
}
const clamp=(value:number,min=0,max=1)=>Math.max(min,Math.min(max,value));
const ease=(value:number)=>1-Math.pow(1-clamp(value),3);
function rounded(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r=0){ctx.beginPath();ctx.roundRect(x,y,w,h,Math.min(r,w/2,h/2));}
function polygon(ctx:CanvasRenderingContext2D,points:number[][]){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}
function star(ctx:CanvasRenderingContext2D,w:number,h:number,points=5,inner=.43){const vertices=[];for(let i=0;i<points*2;i++){const angle=-Math.PI/2+i*Math.PI/points;const radius=i%2?inner:1;vertices.push([w/2+Math.cos(angle)*w/2*radius,h/2+Math.sin(angle)*h/2*radius]);}polygon(ctx,vertices);}
function shapePath(ctx:CanvasRenderingContext2D,element:SocialElement){
 const w=element.width,h=element.height;
 switch(element.shape){
  case 'ellipse':case 'ring':ctx.beginPath();ctx.ellipse(w/2,h/2,w/2,h/2,0,0,Math.PI*2);if(element.shape==='ring'){ctx.moveTo(w*.8,h/2);ctx.ellipse(w/2,h/2,w*.3,h*.3,0,0,Math.PI*2,true);}break;
  case 'pill':rounded(ctx,0,0,w,h,Math.min(w,h)/2);break;
  case 'triangle':polygon(ctx,[[w/2,0],[w,h],[0,h]]);break;
  case 'diamond':polygon(ctx,[[w/2,0],[w,h/2],[w/2,h],[0,h/2]]);break;
  case 'hexagon':polygon(ctx,[[w*.25,0],[w*.75,0],[w,h/2],[w*.75,h],[w*.25,h],[0,h/2]]);break;
  case 'star':star(ctx,w,h);break;
  case 'burst':star(ctx,w,h,12,.7);break;
  case 'arrow':polygon(ctx,[[0,h*.35],[w*.62,h*.35],[w*.62,0],[w,h/2],[w*.62,h],[w*.62,h*.65],[0,h*.65]]);break;
  case 'lightning':polygon(ctx,[[w*.53,0],[w*.07,h*.58],[w*.43,h*.58],[w*.31,h],[w*.94,h*.4],[w*.58,h*.4],[w*.7,0]]);break;
  case 'speech':rounded(ctx,0,0,w,h*.78,element.radius||30);ctx.moveTo(w*.15,h*.7);ctx.lineTo(w*.15,h);ctx.lineTo(w*.38,h*.72);break;
  case 'arch':ctx.beginPath();ctx.moveTo(0,h);ctx.lineTo(0,h*.5);ctx.bezierCurveTo(0,-h*.16,w,-h*.16,w,h*.5);ctx.lineTo(w,h);ctx.closePath();break;
  case 'cross':polygon(ctx,[[w*.35,0],[w*.65,0],[w*.65,h*.35],[w,h*.35],[w,h*.65],[w*.65,h*.65],[w*.65,h],[w*.35,h],[w*.35,h*.65],[0,h*.65],[0,h*.35],[w*.35,h*.35]]);break;
  case 'ticket':ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(w,0);ctx.lineTo(w,h*.35);ctx.bezierCurveTo(w*.83,h*.35,w*.83,h*.65,w,h*.65);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.lineTo(0,h*.65);ctx.bezierCurveTo(w*.17,h*.65,w*.17,h*.35,0,h*.35);ctx.closePath();break;
  case 'bracket':polygon(ctx,[[w,0],[w,h*.14],[w*.2,h*.14],[w*.2,h*.86],[w,h*.86],[w,h],[0,h],[0,0]]);break;
  case 'wave':ctx.beginPath();ctx.moveTo(0,h*.35);ctx.bezierCurveTo(w*.25,-h*.2,w*.25,h*.9,w*.5,h*.35);ctx.bezierCurveTo(w*.75,-h*.2,w*.75,h*.9,w,h*.35);ctx.lineTo(w,h*.68);ctx.bezierCurveTo(w*.75,h*1.2,w*.75,h*.1,w*.5,h*.68);ctx.bezierCurveTo(w*.25,h*1.2,w*.25,h*.1,0,h*.68);ctx.closePath();break;
  case 'heart':ctx.beginPath();ctx.moveTo(w/2,h);ctx.bezierCurveTo(w*.4,h*.8,-w*.2,h*.42,w*.08,h*.13);ctx.bezierCurveTo(w*.28,-h*.1,w*.48,h*.04,w*.5,h*.24);ctx.bezierCurveTo(w*.52,h*.04,w*.72,-h*.1,w*.92,h*.13);ctx.bezierCurveTo(w*1.2,h*.42,w*.6,h*.8,w/2,h);ctx.closePath();break;
  case 'check':polygon(ctx,[[0,h*.48],[w*.14,h*.32],[w*.4,h*.65],[w*.85,0],[w,h*.12],[w*.42,h]]);break;
  case 'line':rounded(ctx,0,h/2-Math.max(2,element.strokeWidth||4)/2,w,Math.max(2,element.strokeWidth||4),0);break;
  default:rounded(ctx,0,0,w,h,element.radius||0);
 }
}
function paintShape(ctx:CanvasRenderingContext2D,element:SocialElement){
 shapePath(ctx,element);
 let fill:CanvasGradient|string=element.fill||element.color||'#6e8f57';
 if(element.gradient&&element.gradient!=='none'){
  const gradient=element.gradient==='radial'?ctx.createRadialGradient(element.width/2,element.height/2,0,element.width/2,element.height/2,Math.max(element.width,element.height)/2):ctx.createLinearGradient(0,0,element.width,element.height);
  gradient.addColorStop(0,element.fill||'#6e8f57');gradient.addColorStop(1,element.gradientColor||'#f4f6f1');fill=gradient;
 }
 ctx.fillStyle=fill;ctx.fill('evenodd');if(element.stroke&&element.stroke!=='transparent'&&(element.strokeWidth||0)>0){ctx.strokeStyle=element.stroke;ctx.lineWidth=element.strokeWidth!;ctx.stroke();}
}
export function wrapText(ctx:CanvasRenderingContext2D,text:string,width:number){
 const result:string[]=[];
 for(const paragraph of text.split('\n')){
  if(!paragraph){result.push('');continue;}
  const words=paragraph.split(/\s+/);let line='';
  for(const word of words){
   if(ctx.measureText(word).width>width){
    if(line){result.push(line);line='';}let fragment='';
    for(const letter of word){if(fragment&&ctx.measureText(fragment+letter).width>width){result.push(fragment);fragment=letter;}else fragment+=letter;}line=fragment;
   }else if(line&&ctx.measureText(line+' '+word).width>width){result.push(line);line=word;}else line=line?line+' '+word:word;
  }
  result.push(line);
 }return result;
}
export function textMetrics(ctx:CanvasRenderingContext2D,element:SocialElement){
 ctx.font=`${element.italic?'italic ':''}${element.fontWeight||500} ${element.fontSize||64}px "${familyOf(element.fontId)}"`;
 ctx.letterSpacing=`${element.letterSpacing||0}px`;const lines=wrapText(ctx,element.text||'',element.width);const lineHeight=(element.fontSize||64)*(element.lineHeight||1.12);return{lines,lineHeight,totalHeight:lines.length*lineHeight};
}
function paintText(ctx:CanvasRenderingContext2D,element:SocialElement,time:number,animated:boolean){
 const {lines,lineHeight}=textMetrics(ctx,element);ctx.fillStyle=element.color||'#142b27';ctx.textBaseline='top';ctx.textAlign=element.align||'left';
 const x=element.align==='center'?element.width/2:element.align==='right'?element.width:0;
 const typed=animated&&element.animation==='typewriter';let remaining=typed?Math.floor(clamp((time-(element.animationDelayMs||0))/(element.animationDurationMs||1100))*(element.text||'').length):Infinity;
 ctx.beginPath();ctx.rect(-2,-4,element.width+4,element.height+8);ctx.clip();
 lines.forEach((line,index)=>{const value=line.slice(0,Math.max(0,remaining));remaining-=line.length+1;ctx.fillText(value,x,index*lineHeight);if(element.underline&&value){const size=element.fontSize||64;const length=ctx.measureText(value).width;ctx.fillRect(x-(element.align==='center'?length/2:element.align==='right'?length:0),index*lineHeight+size, length,Math.max(1,size*.035));}});
}
function paintImage(ctx:CanvasRenderingContext2D,element:SocialElement,resource:RenderResources,time:number,animated:boolean){
 const image=resource.images.get(element.src!);if(!image)return;
 rounded(ctx,0,0,element.width,element.height,element.radius||0);ctx.clip();
 const cover=element.fit!=='contain',ratio=cover?Math.max(element.width/image.naturalWidth,element.height/image.naturalHeight):Math.min(element.width/image.naturalWidth,element.height/image.naturalHeight);
 const width=image.naturalWidth*ratio,height=image.naturalHeight*ratio;
 let cropX=element.cropX??.5,cropY=element.cropY??.5;
 if(cover&&element.animation?.startsWith('pan-')){
  const raw=animated?clamp((time-(element.animationDelayMs||0))/(element.animationDurationMs||3000)):0;
  const progress=raw*raw*(3-2*raw);
  if(element.animation==='pan-down')cropY=progress;else if(element.animation==='pan-up')cropY=1-progress;
  else if(element.animation==='pan-right')cropX=progress;else if(element.animation==='pan-left')cropX=1-progress;
 }
 ctx.drawImage(image,(element.width-width)*cropX,(element.height-height)*cropY,width,height);
}
function paintLogo(ctx:CanvasRenderingContext2D,element:SocialElement,resources:RenderResources){
 const brand=resources.brand,mark=element.variant==='mark';
 const image=brand.logoSrc?resources.images.get(brand.logoSrc):undefined;
 if(image){const ratio=Math.min(element.width/image.naturalWidth,element.height/image.naturalHeight);const width=image.naturalWidth*ratio,height=image.naturalHeight*ratio;ctx.drawImage(image,(element.width-width)/2,(element.height-height)/2,width,height);return;}
 const label=mark?brand.name.split(/\s+/).filter(Boolean).slice(0,2).map(word=>word[0]).join('').toLocaleUpperCase('de'):brand.name;
 let size=Math.min(element.height*.72,mark?element.width*.6:element.height*.65);
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=element.color||brand.ink;
 ctx.font='600 '+size+'px "'+familyOf(brand.headlineFont)+'"';
 while(ctx.measureText(label).width>element.width*.96&&size>8){size-=1;ctx.font='600 '+size+'px "'+familyOf(brand.headlineFont)+'"';}
 if(mark){rounded(ctx,0,0,element.width,element.height,Math.min(element.width,element.height)*.12);ctx.fillStyle=element.fill||brand.accent;ctx.fill();ctx.fillStyle=element.color||brand.paper;}
 ctx.fillText(label,element.width/2,element.height/2);
}
function paintArtwork(ctx:CanvasRenderingContext2D,element:SocialElement,time:number,resources:RenderResources){
 const w=element.width,h=element.height,ink=element.color||'#142b27',accent=element.fill||'#6e8f57';ctx.strokeStyle=ink;ctx.fillStyle=ink;ctx.lineWidth=Math.max(2,w*.008);ctx.lineCap='round';ctx.lineJoin='round';
 const stroke=()=>ctx.stroke();const line=(x:number,y:number,x2:number,y2:number)=>{ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);stroke();};
 switch(element.artwork){
  case 'monogram':paintLogo(ctx,{...element,type:'logo',variant:'mark',color:ink},resources);break;
  case 'grid':for(let i=0;i<6;i++)for(let j=0;j<6;j++){ctx.beginPath();ctx.arc(w*(i+.5)/6,h*(j+.5)/6,Math.max(2,w*.009),0,Math.PI*2);ctx.fill();}break;
  case 'dots':for(let i=0;i<5;i++){ctx.fillStyle=i===2?accent:ink;ctx.beginPath();ctx.arc(w*(i+.5)/5,h/2,Math.min(w/12,h/3),0,Math.PI*2);ctx.fill();}break;
  case 'spark':ctx.translate(w/2,h/2);for(let i=0;i<8;i++){ctx.rotate(Math.PI/4);line(0,h*.12,0,h*.46);}break;
  case 'cursor':polygon(ctx,[[w*.12,h*.05],[w*.9,h*.55],[w*.56,h*.6],[w*.72,h*.92],[w*.5,h],[w*.35,h*.65],[w*.08,h*.89]]);ctx.fillStyle=accent;ctx.fill();ctx.stroke();break;
  case 'orbit':ctx.save();ctx.translate(w/2,h/2);ctx.rotate(-.4);ctx.beginPath();ctx.ellipse(0,0,w*.45,h*.23,0,0,Math.PI*2);stroke();ctx.rotate(.8);ctx.beginPath();ctx.ellipse(0,0,w*.45,h*.23,0,0,Math.PI*2);stroke();ctx.restore();ctx.fillStyle=accent;ctx.beginPath();ctx.arc(w/2,h/2,Math.min(w,h)*.16,0,Math.PI*2);ctx.fill();break;
  case 'ribbon':for(let i=0;i<5;i++){ctx.strokeStyle=i%2?accent:ink;ctx.lineWidth=w*.035;ctx.beginPath();ctx.moveTo(w*.05,h*(.12+i*.16));ctx.bezierCurveTo(w*.4,h*(.5+i*.07),w*.6,h*(-.2+i*.16),w*.95,h*(.25+i*.16));stroke();}break;
  case 'workflow':{const nodes=[[.04,.1],[.38,.1],[.72,.1],[.38,.64],[.72,.64]];line(w*.2,h*.26,w*.88,h*.26);line(w*.54,h*.26,w*.54,h*.8);line(w*.54,h*.8,w*.88,h*.8);for(const [x,y]of nodes){rounded(ctx,w*x,h*y,w*.24,h*.31,w*.03);ctx.fillStyle=x>.5?accent:ink;ctx.fill();ctx.fillStyle='#f4f6f1';ctx.beginPath();ctx.arc(w*(x+.12),h*(y+.155),w*.035,0,Math.PI*2);ctx.fill();}const p=(time%3000)/3000;ctx.fillStyle=accent;ctx.beginPath();ctx.arc(w*(.2+p*.65),h*.26,w*.018,0,Math.PI*2);ctx.fill();break;}
  case 'chat':rounded(ctx,w*.02,h*.04,w*.76,h*.43,w*.055);ctx.fillStyle=ink;ctx.fill();rounded(ctx,w*.23,h*.55,w*.75,h*.4,w*.055);ctx.fillStyle=accent;ctx.fill();ctx.strokeStyle='#f4f6f1';line(w*.14,h*.2,w*.6,h*.2);line(w*.14,h*.3,w*.43,h*.3);line(w*.36,h*.7,w*.82,h*.7);break;
  case 'stack':for(let i=2;i>=0;i--){rounded(ctx,w*(.05+i*.08),h*(.05+i*.1),w*.75,h*.65,w*.025);ctx.fillStyle=i===0?'#f4f6f1':i===1?accent:ink;ctx.fill();ctx.strokeStyle=ink;stroke();}break;
  case 'window':case 'browser':default:rounded(ctx,w*.02,h*.04,w*.96,h*.92,w*.025);ctx.fillStyle='#f4f6f1';ctx.fill();ctx.strokeStyle=ink;stroke();line(w*.02,h*.2,w*.98,h*.2);for(let i=0;i<3;i++){ctx.fillStyle=i===0?accent:ink;ctx.beginPath();ctx.arc(w*(.08+i*.045),h*.12,w*.01,0,Math.PI*2);ctx.fill();}ctx.fillStyle=ink;rounded(ctx,w*.08,h*.3,w*.38,h*.08,w*.008);ctx.fill();rounded(ctx,w*.08,h*.44,w*.3,h*.05,w*.006);ctx.fill();ctx.fillStyle=accent;rounded(ctx,w*.54,h*.28,w*.37,h*.48,w*.01);ctx.fill();ctx.fillStyle=ink;rounded(ctx,w*.08,h*.67,w*.2,h*.09,w*.01);ctx.fill();break;
 }
}
function paintElement(ctx:CanvasRenderingContext2D,element:SocialElement,resource:RenderResources,time:number,animated:boolean,videoFrames?:SlideVideoFrames){
 if(element.hidden)return;ctx.save();const center={x:element.x+element.width/2,y:element.y+element.height/2};ctx.translate(center.x,center.y);ctx.rotate(element.rotation*Math.PI/180);ctx.translate(-element.width/2,-element.height/2);ctx.globalAlpha*=element.opacity;
 const animation=element.animation||'none',progress=ease((time-(element.animationDelayMs||0))/(element.animationDurationMs||800));
 if(animated&&animation!=='none'){
  if(animation==='fade'||animation==='rise'||animation==='slide-left'||animation==='zoom')ctx.globalAlpha*=progress;
  if(animation==='rise')ctx.translate(0,(1-progress)*80);
  if(animation==='slide-left')ctx.translate((1-progress)*120,0);
  if(animation==='zoom'){const scale=.82+.18*progress;ctx.translate(element.width/2,element.height/2);ctx.scale(scale,scale);ctx.translate(-element.width/2,-element.height/2);}
  if(animation==='float')ctx.translate(0,Math.sin(time/850)*12);
 }
 if(element.shadow){ctx.shadowColor='rgba(10,22,33,.18)';ctx.shadowBlur=32;ctx.shadowOffsetX=9;ctx.shadowOffsetY=18;}
 if(element.type==='text')paintText(ctx,element,time,animated);else if(element.type==='image')paintImage(ctx,element,resource,time,animated);else if(element.type==='video')paintVideo(ctx,element,videoFrames?.get(element.id));else if(element.type==='logo')paintLogo(ctx,element,resource);else if(element.type==='artwork')paintArtwork(ctx,element,animated?time:0,resource);else paintShape(ctx,element);
 ctx.restore();
}
function paintVideo(ctx:CanvasRenderingContext2D,element:SocialElement,frame:VideoFrame|undefined){
 if(!frame)return;
 rounded(ctx,0,0,element.width,element.height,element.radius||0);ctx.clip();
 const scales=[element.width/frame.width,element.height/frame.height];
 const scale=element.fit==='contain'?Math.min(...scales):Math.max(...scales);
 const width=frame.width*scale,height=frame.height*scale;
 ctx.drawImage(frame.canvas,(element.width-width)*(element.cropX??.5),(element.height-height)*(element.cropY??.5),width,height);
}
export function drawSlide(ctx:CanvasRenderingContext2D,slide:SocialSlide,width:number,height:number,resources:RenderResources,options:{time?:number;animated?:boolean;transparent?:boolean;videoFrames?:SlideVideoFrames}={}){
 if(!options.transparent&&slide.background!=='transparent'){ctx.fillStyle=slide.background;ctx.fillRect(0,0,width,height);}
 for(const element of slide.elements)paintElement(ctx,element,resources,options.time||0,options.animated||false,options.videoFrames);
}
export function slideAt(project:SocialProject,time:number){let start=0;for(let i=0;i<project.slides.length;i++){const slide=project.slides[i];if(time<start+slide.durationMs||i===project.slides.length-1)return{slide,index:i,time:Math.max(0,time-start),start};start+=slide.durationMs;}return{slide:project.slides[0],index:0,time:0,start:0};}
export function drawFrame(ctx:CanvasRenderingContext2D,project:SocialProject,time:number,resources:RenderResources,videoFrames?:Map<string,SlideVideoFrames>){
 const {width,height}=formatOf(project),active=slideAt(project,time),progress=active.slide.transitionMs?ease(active.time/active.slide.transitionMs):1;
 ctx.clearRect(0,0,width,height);
 const transition=active.index>0&&progress<1?active.slide.transition:'none';
 if(transition!=='none')drawSlide(ctx,project.slides[active.index-1],width,height,resources,{time:project.slides[active.index-1].durationMs,animated:true,videoFrames:videoFrames?.get(project.slides[active.index-1].id)});
 ctx.save();
 if(transition==='fade')ctx.globalAlpha=progress;
 if(transition==='slide-left')ctx.translate(width*(1-progress),0);
 if(transition==='slide-up')ctx.translate(0,height*(1-progress));
 if(transition==='wipe'){ctx.beginPath();ctx.rect(0,0,width*progress,height);ctx.clip();}
 if(transition==='zoom'){ctx.globalAlpha=progress;ctx.translate(width/2,height/2);ctx.scale(.8+.2*progress,.8+.2*progress);ctx.translate(-width/2,-height/2);}
 drawSlide(ctx,active.slide,width,height,resources,{time:active.time,animated:true,videoFrames:videoFrames?.get(active.slide.id)});ctx.restore();
}
