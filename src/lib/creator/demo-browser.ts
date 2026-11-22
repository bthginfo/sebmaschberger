/** Only the selected public demo can navigate inside its browser window. */
export function demoBrowserPath(value:string,base:string,origin:string):string|null{
  try{
    const url=new URL(value,origin);
    if(url.origin!==origin||url.username||url.password)return null;
    if(url.pathname!==base&&!url.pathname.startsWith(base+'/'))return null;
    return url.pathname+url.search+url.hash;
  }catch{return null;}
}

/** Messages belong to one same-origin iframe and one untouched fixture version. */
export function isDemoFrameMessage(event:Pick<MessageEvent,'origin'|'source'|'data'>,source:MessageEventSource|null,origin:string,key:string):boolean{
  return Boolean(source&&event.source===source&&event.origin===origin&&event.data&&typeof event.data==='object'&&event.data.key===key);
}
