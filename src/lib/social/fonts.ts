import type { FontId, SocialProject } from './model';

export const FONTS:{id:FontId;name:string;family:string;category:string}[]=[
 {id:'outfit',name:'Outfit',family:'Social Outfit',category:'Geometrisch'},
 {id:'manrope',name:'Manrope',family:'Social Manrope',category:'Klar'},
 {id:'dm-sans',name:'DM Sans',family:'Social DM Sans',category:'Vielseitig'},
 {id:'barlow-condensed',name:'Barlow Condensed',family:'Social Barlow',category:'Poster'},
 {id:'inter',name:'Inter',family:'Social Inter',category:'Neutral'},
 {id:'space-grotesk',name:'Space Grotesk',family:'Social Space',category:'Technisch'},
 {id:'sora',name:'Sora',family:'Social Sora',category:'Digital'},
 {id:'syne',name:'Syne',family:'Social Syne',category:'Expressiv'},
 {id:'archivo',name:'Archivo',family:'Social Archivo',category:'Markant'},
 {id:'oswald',name:'Oswald',family:'Social Oswald',category:'Kompakt'},
 {id:'playfair-display',name:'Playfair Display',family:'Social Playfair',category:'Editorial'},
 {id:'cormorant-garamond',name:'Cormorant Garamond',family:'Social Cormorant',category:'Elegant'},
 {id:'bodoni-moda',name:'Bodoni Moda',family:'Social Bodoni',category:'Kontrast'},
 {id:'fraunces',name:'Fraunces',family:'Social Fraunces',category:'Charakter'},
 {id:'rubik',name:'Rubik',family:'Social Rubik',category:'Freundlich'},
 {id:'fira-code',name:'Fira Code',family:'Social Fira',category:'Monospace'}
];
export const familyOf=(id:FontId='outfit')=>FONTS.find(font=>font.id===id)!.family;
const pending=new Map<string,Promise<void>>();
export function loadFont(id:FontId):Promise<void>{
 if(typeof document==='undefined')return Promise.resolve();
 const previous=pending.get(id);if(previous)return previous;
 const work=(async()=>{
  const family=familyOf(id);
  const weights=id==='barlow-condensed'?[400,700,900]:[0];
  await Promise.all(weights.map(async weight=>{
   const filename=id+(weight?'-'+weight:'')+'.woff2';
   const face=new FontFace(family,`url(/social-studio/fonts/${filename})`,{weight:weight?String(weight):'100 900',style:'normal'});
   await face.load();document.fonts.add(face);
  }));
 })();pending.set(id,work);work.catch(()=>pending.delete(id));return work;
}
export async function loadProjectFonts(project:SocialProject){
 const fonts=new Set<FontId>([project.brand.headlineFont,project.brand.bodyFont]);
 for(const slide of project.slides)for(const element of slide.elements)if(element.fontId)fonts.add(element.fontId);
 await Promise.all([...fonts].map(loadFont));
}
