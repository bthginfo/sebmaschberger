import type {SectionContent} from '../types';
export function createScrollStoryContent():SectionContent{
  return {heading:'Deine Geschichte in Bildern.',items:[
    {id:crypto.randomUUID(),title:'Dein erster Moment.',text:'Erzähle, was Menschen hier entdecken können.',image:{src:'/media/placeholder-landscape.svg',alt:'Eigenes Story-Bild ergänzen',position:'50% 50%'}},
    {id:crypto.randomUUID(),title:'Dein nächster Schritt.',text:'Zeige einen weiteren Blick auf deine Arbeit.',image:{src:'/media/placeholder-landscape.svg',alt:'Eigenes Story-Bild ergänzen',position:'50% 50%'}},
    {id:crypto.randomUUID(),title:'Deine Einladung.',text:'Mach den nächsten sinnvollen Schritt leicht.',image:{src:'/media/placeholder-landscape.svg',alt:'Eigenes Story-Bild ergänzen',position:'50% 50%'}}
  ]};
}
