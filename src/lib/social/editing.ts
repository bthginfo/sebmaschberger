import { durationOf, formatOf, type SocialBrandProfile, type SocialElement, type SocialProject, type SocialSlide, type FormatId } from './model';
export const paletteOf=(brand:SocialBrandProfile)=>[brand.ink,brand.paper,brand.accent,'#ffffff','#8b9b91','#151b18'];
export const SHAPE_NAMES:Record<string,string>={rectangle:'Rechteck',ellipse:'Kreis',pill:'Kapsel',line:'Linie',triangle:'Dreieck',diamond:'Raute',hexagon:'Sechseck',star:'Stern',arrow:'Pfeil',lightning:'Blitz',speech:'Sprechblase',ring:'Ring',arch:'Bogen',cross:'Plus',ticket:'Ticket',burst:'Sternkranz',bracket:'Klammer',wave:'Welle',heart:'Herz',check:'Haken'};
export const ARTWORK_NAMES:Record<string,string>={browser:'Browser',workflow:'Workflow',orbit:'Orbit',grid:'Punktraster',spark:'Funkeln',cursor:'Cursor',chat:'Chat',monogram:'Monogramm',ribbon:'Bänder',dots:'Punkte',window:'Fenster',stack:'Stapel'};
export const ANIMATION_NAMES:Record<string,string>={none:'Keine',fade:'Einblenden',rise:'Nach oben', 'slide-left':'Von rechts',zoom:'Vergrößern',float:'Schweben',typewriter:'Schreibmaschine','pan-up':'Bildausschnitt nach oben','pan-down':'Bildausschnitt nach unten','pan-left':'Bildausschnitt nach links','pan-right':'Bildausschnitt nach rechts'};
export const TRANSITION_NAMES:Record<string,string>={none:'Schnitt',fade:'Überblenden','slide-left':'Nach links','slide-up':'Nach oben',wipe:'Aufdecken',zoom:'Zoom'};
export const uid=()=>crypto.randomUUID();
// Studio documents contain only JSON data.
export const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
export function createElement(type:SocialElement['type'],brand:SocialBrandProfile,patch:Partial<SocialElement>={}):SocialElement{
 return{id:uid(),type,name:type==='text'?'Neuer Text':type==='shape'?'Neue Form':type==='image'?'Bild':type==='video'?'Video':type==='logo'?'Logo':'Artwork',x:150,y:260,width:type==='text'?760:350,height:type==='text'?200:350,rotation:0,opacity:1,locked:false,hidden:false,
 ...(type==='text'?{text:'Ihre nächste Idee.',fontId:brand.headlineFont,fontSize:90,fontWeight:600,color:brand.ink,lineHeight:1.08,align:'left'}:type==='shape'?{shape:'rectangle',fill:brand.accent,radius:0}:type==='logo'?{variant:'wordmark',width:270,height:100,color:brand.ink}:type==='artwork'?{artwork:'orbit',color:brand.ink,fill:brand.accent}:{}),...patch};
}
export function createSlide(brand:SocialBrandProfile):SocialSlide{return{id:uid(),name:'Neue Slide',durationMs:5000,background:brand.paper,transition:'fade',transitionMs:500,elements:[createElement('logo',brand,{x:72,y:72,width:340,height:85})]};}
export function createProject(brand:SocialBrandProfile,kind:'post'|'reel'='post'):SocialProject{return{id:uid(),brand:clone(brand),kind,title:kind==='reel'?'Neues Reel':'Neuer Post',caption:'',tags:[],formatId:kind==='reel'?'story':'portrait',schemaVersion:1,slides:[createSlide(brand)]};}
export function duplicateProject(project:SocialProject):SocialProject{const next=clone(project);next.id=uid();next.title=project.title.slice(0,132)+' · Kopie';next.slides.forEach(slide=>{slide.id=uid();slide.elements.forEach(element=>element.id=uid());});return next;}
export function resizeProject(project:SocialProject,formatId:FormatId){const from=formatOf(project),to=formatOf({formatId});const sx=to.width/from.width,sy=to.height/from.height,scale=Math.min(sx,sy);const next=clone(project);next.formatId=formatId;for(const slide of next.slides)for(const element of slide.elements){element.x*=sx;element.y*=sy;element.width*=sx;element.height*=sy;if(element.fontSize)element.fontSize*=scale;if(element.radius)element.radius*=scale;if(element.strokeWidth)element.strokeWidth*=scale;}return next;}
/** A format variant is a new draft. Fit artwork uniformly and keep full-bleed backgrounds full. */
export function createFormatVariant(project: SocialProject, formatId: FormatId, kind: SocialProject["kind"]): SocialProject {
 if (kind === "reel" && (formatId !== "story" || durationOf(project) > 90000)) throw new Error("Reels brauchen 9:16 und dürfen höchstens 90 Sekunden lang sein.");
 const from=formatOf(project),to=formatOf({formatId}),scale=Math.min(to.width/from.width,to.height/from.height);
 const dx=(to.width-from.width*scale)/2,dy=(to.height-from.height*scale)/2;
 const next=duplicateProject(project);
 next.title=project.title.slice(0,112)+" · "+(kind==="reel"?"Reel":to.ratio);
 next.formatId=formatId;next.kind=kind;
 const bound=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
 for(const slide of next.slides){
  const groups=new Map<string,string>();
  for(const element of slide.elements){
   if(element.groupId){const original=element.groupId;if(!groups.has(original))groups.set(original,uid());element.groupId=groups.get(original);}
   const bleed=element.type!=="text"&&!element.rotation&&element.x===0&&element.y===0&&element.width===from.width&&element.height===from.height;
   if(bleed){
    element.width=to.width;element.height=to.height;
   }else{
    element.x=bound(element.x*scale+dx,-10000,10000);element.y=bound(element.y*scale+dy,-10000,10000);
    element.width=bound(element.width*scale,1,10000);element.height=bound(element.height*scale,1,10000);
   }
   if(element.fontSize!==undefined)element.fontSize=bound(element.fontSize*scale,6,600);
   if(element.letterSpacing!==undefined)element.letterSpacing=bound(element.letterSpacing*scale,-30,100);
   if(element.radius!==undefined)element.radius*=scale;
   if(element.strokeWidth!==undefined)element.strokeWidth*=scale;
  }
 }
 return next;
}
export function selectionBounds(elements:SocialElement[]){if(!elements.length)return null;const x=Math.min(...elements.map(element=>element.x)),y=Math.min(...elements.map(element=>element.y));return{x,y,width:Math.max(...elements.map(element=>element.x+element.width))-x,height:Math.max(...elements.map(element=>element.y+element.height))-y};}
export function snapDelta(selected:SocialElement[],others:SocialElement[],width:number,height:number,dx:number,dy:number,threshold=9){
 const bounds=selectionBounds(selected);if(!bounds)return{dx,dy,guides:[] as {axis:'x'|'y';value:number}[]};
 const guides:{axis:'x'|'y';value:number}[]=[];const xs=[0,width/2,width,60,width-60],ys=[0,height/2,height,60,height-60];
 for(const element of others){xs.push(element.x,element.x+element.width/2,element.x+element.width);ys.push(element.y,element.y+element.height/2,element.y+element.height);}
 let minX=threshold,minY=threshold,offsetX=0,offsetY=0,gx:number|undefined,gy:number|undefined;
 for(const x of [bounds.x+dx,bounds.x+dx+bounds.width/2,bounds.x+dx+bounds.width])for(const target of xs){const distance=Math.abs(x-target);if(distance<minX){minX=distance;offsetX=target-x;gx=target;}}
 for(const y of [bounds.y+dy,bounds.y+dy+bounds.height/2,bounds.y+dy+bounds.height])for(const target of ys){const distance=Math.abs(y-target);if(distance<minY){minY=distance;offsetY=target-y;gy=target;}}
 if(gx!==undefined)guides.push({axis:'x',value:gx});if(gy!==undefined)guides.push({axis:'y',value:gy});return{dx:dx+offsetX,dy:dy+offsetY,guides};
}
