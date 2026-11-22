export const siteNavigationEvent='ws:site-navigation';
/** Public documents use Next navigation; files, anchors and protected tools keep native behavior. */
export function isClientPageLink(href:string,{download=false,target}:{download?:boolean;target?:string}={}):boolean{
  if(download||target||!href.startsWith('/')||href.startsWith('//'))return false;
  if(/^\/(?:api|admin|_next|assets|media|downloads)(?:\/|$|[?#])/.test(href))return false;
  if(/\/cms(?:\/|$|[?#])/.test(href))return false;
  return !/\.(?:pdf|zip|png|jpe?g|webp|avif|svg|mp3|mp4|webm|wav|txt|csv|xlsx?)(?:$|[?#])/i.test(href);
}
