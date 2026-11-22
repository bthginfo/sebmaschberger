/** AT Protocol links use UTF-8 byte offsets, not JavaScript string indices. */
export function blueskyLinkFacets(text:string){
 const facets:{index:{byteStart:number;byteEnd:number};features:{$type:string;uri:string}[]}[]=[];
 for(const match of text.matchAll(/https?:\/\/[^\s<>"\u0000-\u001f\u007f]+/giu)){
  let label=match[0].replace(/[.,;!]+$/u,'');
  for(const [open,close] of [['(',')'],['[',']'],['{','}']])while(label.endsWith(close)&&label.split(close).length>label.split(open).length)label=label.slice(0,-1);
  let url:URL;try{url=new URL(label);}catch{continue;}
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||label.length>2048)continue;
  const byteStart=new TextEncoder().encode(text.slice(0,match.index)).length;
  facets.push({index:{byteStart,byteEnd:byteStart+new TextEncoder().encode(label).length},features:[{$type:'app.bsky.richtext.facet#link',uri:url.toString()}]});
 }
 return facets;
}
