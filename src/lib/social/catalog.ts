import {formatOf,type SocialBrandProfile,type SocialElement,type SocialProject,type SocialSlide,type FormatId} from './model';

type TemplateCopy={headline:string;body:string;label:string};
const copies:TemplateCopy[]=[
 {headline:'Aktuelles.\nAuf einen Blick.',body:'Ersetzen Sie diesen Text durch Ihre Neuigkeiten.',label:'Aktuelles'},
 {headline:'Ein Bild.\nIhre Geschichte.',body:'Wählen Sie Ihr eigenes Bild und erzählen Sie, was dahintersteckt.',label:'Einblick'},
 {headline:'Das sollten\nSie wissen.',body:'Erster wichtiger Punkt.\nZweiter wichtiger Punkt.\nEin klarer nächster Schritt.',label:'Gut zu wissen'},
 {headline:'Eine gute Idee\nverdient Platz.',body:'Hier beginnt Ihr eigener Beitrag.',label:'Ihr Thema'},
 {headline:'Von der Idee\nzum nächsten Schritt.',body:'Zeigen Sie einen Ablauf aus Ihrem Alltag.',label:'So funktioniert es'},
 {headline:'Ihr Thema.\nIhre Worte.',body:'Ein Gedanke, den Sie mit Ihrer Community teilen möchten.',label:'Gedanken'},
 {headline:'Etwas Neues?\nHier zeigen.',body:'Beschreiben Sie kurz, was Ihr Angebot besonders macht.',label:'Ihr Angebot'},
 {headline:'Menschen.\nDie dahinterstehen.',body:'Platz für Ihr Team, Ihre Geschichte oder einen Blick hinter die Kulissen.',label:'Hinter den Kulissen'}
];
const formats:FormatId[]=['portrait','square','portrait','tall','landscape','square','portrait','portrait'];
const names=['Neuigkeiten','Bildgeschichte','Drei Punkte','Typografie','Ein Ablauf','Ein Gedanke','Neues Angebot','Team und Alltag'];
function fitText(text:string,width:number,height:number,start:number,lineHeight:number){
 let size=start;
 while(size>24){let lines=0;for(const paragraph of text.split('\n')){let current=0;lines++;for(const word of paragraph.split(/\s+/)){const length=word.length*size*.64;if(current&&current+length+size*.64>width){lines++;current=length;}else current+=length+size*.64;}}if(lines*size*lineHeight<height*.94)break;size-=2;}
 return size;
}
function makeSlide(brand:SocialBrandProfile,copy:TemplateCopy,family:number,id:string,formatId:FormatId,animated=false):SocialSlide{
 const {width:W,height:H}=formatOf({formatId}),m=72,dark=[0,3,6].includes(family),background=dark?brand.ink:brand.paper,fg=dark?brand.paper:brand.ink;
 let serial=0;const elements:SocialElement[]=[];
 const base=(type:SocialElement['type'],name:string,x:number,y:number,width:number,height:number,patch:Partial<SocialElement>={}):SocialElement=>({id:id+'-e'+serial++,type,name,x,y,width,height,rotation:0,opacity:1,locked:false,hidden:false,...patch});
 const shape=(x:number,y:number,w:number,h:number,fill:string,patch:Partial<SocialElement>={})=>elements.push(base('shape','Fläche',x,y,w,h,{shape:'rectangle',fill,...patch}));
 const text=(name:string,value:string,x:number,y:number,w:number,h:number,size:number,color=fg,headline=false)=>elements.push(base('text',name,x,y,w,h,{text:value,fontId:headline?brand.headlineFont:brand.bodyFont,fontWeight:headline?600:400,fontSize:fitText(value,w,h,size,headline?1.08:1.25),lineHeight:headline?1.08:1.25,color,animation:animated?(headline?'rise':'fade'):'none',animationDelayMs:headline?130:260,animationDurationMs:800}));
 const headline=(x:number,y:number,w:number,h:number,size=120,color=fg)=>text('Headline',copy.headline,x,y,w,h,size,color,true);
 const body=(x:number,y:number,w:number,h:number,size=37,color=fg)=>text('Begleittext',copy.body,x,y,w,h,size,color);
 const art=(kind:SocialElement['artwork'],x:number,y:number,w:number,h:number,patch:Partial<SocialElement>={})=>elements.push(base('artwork','Artwork',x,y,w,h,{artwork:kind,color:fg,fill:brand.accent,animation:animated?'float':'none',...patch}));
 const label=()=>text('Thema',copy.label.toLocaleUpperCase('de'),m,H*.075,W-2*m,50,25);
 const footer=()=>{shape(m,H-112,W-2*m,1,fg,{opacity:.24});elements.push(base('logo','Marke',m,H-98,440,65,{color:fg,variant:'wordmark'}));if(brand.website)text('Website',brand.website.replace(/^https?:\/\//,'').replace(/\/$/,''),W-520,H-78,448,40,25,fg);};
 switch(family){
  case 1:shape(0,0,W*.52,H,brand.accent);elements.push(base('image','Eigenes Bild',0,0,W*.52,H,{src:'/social-studio/image-placeholder.svg',fit:'cover'}));text('Thema',copy.label.toLocaleUpperCase('de'),W*.58,H*.09,W*.36,50,24,brand.ink);headline(W*.58,H*.24,W*.35,H*.37,90,brand.ink);body(W*.58,H*.7,W*.35,H*.15,30,brand.ink);break;
  case 2:label();headline(m,H*.2,W-2*m,H*.29);shape(m,H*.54,130,7,brand.accent);body(m,H*.61,W-2*m,H*.21,40);break;
  case 3:art('orbit',W*.42,H*.08,730,H*.49,{opacity:.16,color:brand.paper});label();headline(m,H*.22,W-2*m,H*.43,148);body(m,H*.77,W-2*m,H*.1,39);break;
  case 4:label();headline(m,H*.21,W*.51,H*.35,90);art('workflow',W*.59,H*.28,W*.33,H*.32,{color:brand.ink});body(m,H*.71,W-2*m,H*.14,31);break;
  case 5:label();shape(W-260,H*.12,150,150,brand.accent,{shape:'ellipse',opacity:.32});headline(m,H*.3,W-2*m,H*.32,123);body(m,H*.7,W-2*m,H*.13,38);break;
  case 6:shape(92,H*.2,W-168,H*.49,brand.accent,{rotation:3});shape(72,H*.18,W-168,H*.49,brand.paper,{rotation:-2,shadow:true});text('Thema',copy.label.toLocaleUpperCase('de'),114,H*.24,W-270,50,25,brand.ink);headline(114,H*.34,W-270,H*.23,104,brand.ink);body(114,H*.59,W-270,H*.08,29,brand.ink);text('Signatur','Platz für Ihre nächste Idee.',m,H*.79,W-2*m,H*.07,35);break;
  case 7:label();headline(m,H*.18,W-2*m,H*.28);shape(m,H*.5,400,H*.22,brand.accent,{rotation:-3});elements.push(base('image','Eigenes Team-Bild',m+18,H*.51,364,H*.18,{src:'/social-studio/image-placeholder.svg',fit:'cover',rotation:-3}));body(W*.49,H*.53,W*.44,H*.2,38);break;
  default:label();headline(m,H*.2,W-2*m,H*.3);shape(m,H*.55,240,7,brand.accent);body(m,H*.64,W*.55,H*.2,38);art('browser',W*.68,H*.65,W*.25,H*.16,{rotation:-5,shadow:true});break;
 }
 if(family!==1)footer();
 return{id,name:copy.label,durationMs:5000,background,transition: animated?(['fade','slide-left','wipe','slide-up'][family%4] as SocialSlide['transition']):'fade',transitionMs:500,elements};
}
export function getSeedProjects(profile:SocialBrandProfile):SocialProject[]{
 const brand=structuredClone(profile);const posts=copies.map((copy,index):SocialProject=>({id:'template-post-'+String(index+1).padStart(2,'0'),brand:structuredClone(brand),kind:'post',title:'Vorlage · '+names[index],caption:'Caption-Vorlage: Beschreiben Sie hier Ihr eigenes Thema. Ergänzen Sie die wichtigen Informationen und einen passenden nächsten Schritt. Prüfen Sie Namen, Zeiten und Links vor dem Veröffentlichen.',tags:['Vorlage'],formatId:formats[index],schemaVersion:1,slides:[makeSlide(brand,copy,index,'template-post-'+(index+1)+'-slide-1',formats[index])]}));
 const reels=[
  {title:'Eine Idee in vier Slides',copies:[copies[0],copies[1],copies[2],{headline:'Jetzt sind\nSie dran.',body:'Ersetzen Sie die Vorlagen durch Ihre eigenen Inhalte.',label:'Ihr nächster Schritt'}],families:[0,1,2,6]},
  {title:'Ein Ablauf, klar erklärt',copies:[{headline:'So wird\neine Idee konkret.',body:'Zeigen Sie den Anfang Ihres Ablaufs.',label:'Der Anfang'},copies[4],{headline:'Ein Blick\nauf das Ergebnis.',body:'Hier ist Platz für Ihr eigenes Bild und Ihre Beschreibung.',label:'Ihr Ergebnis'},{headline:'Eine Frage?\nSprechen wir darüber.',body:'Fügen Sie eine passende Kontaktmöglichkeit hinzu.',label:'Kontakt'}],families:[3,4,7,5]}
 ].map((entry,index):SocialProject=>({id:'template-reel-'+String(index+1).padStart(2,'0'),brand:structuredClone(brand),kind:'reel',title:'Reel-Vorlage · '+entry.title,caption:'Caption-Vorlage: Erzählen Sie hier die Geschichte Ihres Reels. Ergänzen Sie Ihre eigenen Fakten, passende Begriffe und eine klare Einladung zur nächsten Handlung.',tags:['Vorlage'],formatId:'story',schemaVersion:1,slides:entry.copies.map((copy,slide)=>makeSlide(brand,copy,entry.families[slide],'template-reel-'+(index+1)+'-slide-'+(slide+1),'story',true))}));
 return[...posts,...reels];
}
export function getSeedProject(id:string,brand:SocialBrandProfile):SocialProject|null{return getSeedProjects(brand).find(project=>project.id===id)??null;}
