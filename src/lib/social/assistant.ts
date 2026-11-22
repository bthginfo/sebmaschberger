import type {SocialSuggestion} from '../assistant/model';
import {createElement,createProject} from './editing';
import type {SocialBrandProfile} from './model';

function fit(text:string,width:number,height:number,start:number){
 let size=start;
 // Reserve a wide glyph for every character, so long uppercase or emoji-heavy proposals also fit.
 while(size>14){const characters=Math.max(1,Math.floor(width/(size*1.12))),lines=text.split('\n').reduce((count,line)=>count+Math.max(1,Math.ceil(line.length/characters)),0);if(lines*size*1.2<height*.94)break;size-=2;}
 return size;
}
/** A proposal always becomes a new unsaved document; existing projects stay unchanged. */
export function socialProjectFromSuggestion(brand:SocialBrandProfile,post:SocialSuggestion){
 const project=createProject(brand);project.title=post.headline.slice(0,140);project.caption=post.caption;project.tags=['KI-Entwurf'];
 project.slides[0].elements.push(
  createElement('text',brand,{name:'Vorgeschlagene Headline',text:post.headline,x:72,y:340,width:936,height:410,fontSize:fit(post.headline,936,410,80),lineHeight:1.1}),
  createElement('text',brand,{name:'Vorgeschlagener Kurztext',text:post.body,x:72,y:810,width:936,height:370,fontId:brand.bodyFont,fontSize:fit(post.body,936,370,40),lineHeight:1.2})
 );
 return project;
}
