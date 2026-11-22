export type MediaReferenceAsset = {id:string;url:string};

/** Retained revisions are queried directly: the admin snapshot contains only metadata on Neon. */
export const MEDIA_REFERENCE_QUERY = `SELECT (
 EXISTS(SELECT 1 FROM ws_site WHERE strpos(draft::text,$1)>0 OR strpos(published::text,$1)>0)
 OR EXISTS(SELECT 1 FROM ws_revisions WHERE strpos(content::text,$1)>0)
 OR EXISTS(SELECT 1 FROM ws_records WHERE collection IN ('social-projects','social-brand','social-publications')
   AND (strpos(data::text,$1)>0 OR strpos(data::text,$2)>0))
) AS referenced`;

export function mediaReferenceNeedles(asset:MediaReferenceAsset):[string,string] {
 return[asset.url,'/api/admin/social/media/'+encodeURIComponent(asset.id)];
}
function contains(value:unknown,needles:string[]):boolean {
 if(typeof value==='string')return needles.some(needle=>value.includes(needle));
 if(Array.isArray(value))return value.some(entry=>contains(entry,needles));
 if(value&&typeof value==='object')return Object.values(value).some(entry=>contains(entry,needles));
 return false;
}
export function hasLocalMediaReference(store:{state:unknown;records:Record<string,unknown>},asset:MediaReferenceAsset):boolean {
 const needles=mediaReferenceNeedles(asset);
 if(contains(store.state,needles))return true;
 return Object.entries(store.records).some(([key,value])=>(key.startsWith('social-projects:')||key.startsWith('social-brand:')||key.startsWith('social-publications:'))&&contains(value,needles));
}
export async function hasRemoteMediaReference(query:(sql:string,parameters:unknown[])=>Promise<Record<string,unknown>[]>,asset:MediaReferenceAsset):Promise<boolean> {
 const rows=await query(MEDIA_REFERENCE_QUERY,mediaReferenceNeedles(asset));
 return rows[0]?.referenced===true;
}
