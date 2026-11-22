export type StudioMediaFilter = "all" | "image" | "video";
type SearchableMedia = { name: string; mimeType?: string; src: string };
export const studioVideo = (media: SearchableMedia) => Boolean(media.mimeType?.startsWith("video/"));
const normalized = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("de").replaceAll("ß","ss");

export function filterStudioMedia<T extends SearchableMedia>(assets: readonly T[], query: string, kind: StudioMediaFilter) {
 const words=normalized(query).trim().split(/\s+/).filter(Boolean);
 const found=new Set<string>();
 return assets.filter(item=>{
  if(found.has(item.src)||kind!=="all"&&(kind==="video")!==studioVideo(item))return false;
  if(!words.every(word=>normalized(item.name).includes(word)))return false;
  found.add(item.src);return true;
 });
}
