import { z } from 'zod';

export const VIDEO_MIME_TYPES = ['video/mp4','video/webm'] as const;
export const MAX_VIDEO_BYTES = 60 * 1024 * 1024;
export const MAX_VIDEO_DURATION_MS = 90_000;
export const VIDEO_COLLECTION = 'social-studio-videos';
export const VIDEO_PREFIX = '/api/admin/social/videos/';
export const videoSource = z.string().refine(value=>videoId(value)!==null,'Bitte wählen Sie ein Video aus Ihrer Mediathek.');
export function videoId(source:string){
 if(!source.startsWith(VIDEO_PREFIX))return null;
 const parsed=z.uuid().safeParse(source.slice(VIDEO_PREFIX.length));
 return parsed.success?parsed.data:null;
}
export const videoUploadSchema=z.object({
 id:z.uuid(),
 name:z.string().trim().min(1).max(200).refine(value=>!(/[\u0000-\u001f\u007f/\\]/.test(value))),
 mimeType:z.enum(VIDEO_MIME_TYPES),
 size:z.number().int().positive().max(MAX_VIDEO_BYTES,'Das Video darf höchstens 60 MB groß sein.'),
}).strict();
export type VideoUpload=z.infer<typeof videoUploadSchema>;
export type VideoAsset=VideoUpload&{src:string;width:number;height:number;durationMs:number;createdAt:string};
export const videoAssetView=({id,name,src,width,height,durationMs,mimeType,size,createdAt}:VideoAsset):VideoAsset=>({id,name,src,width,height,durationMs,mimeType,size,createdAt});
export const isVideoAsset=(asset:{mimeType:string;durationMs?:number}):asset is VideoAsset=>VIDEO_MIME_TYPES.some(value=>value===asset.mimeType)&&typeof asset.durationMs==='number';

export function readVideoRange(header:string|null,total:number):{start:number;end:number}|null|'invalid'{
 if(!header)return null;
 const match=/^bytes=(\d*)-(\d*)$/.exec(header);
 if(!match||(!match[1]&&!match[2]))return 'invalid';
 const start=match[1]?Number(match[1]):Math.max(0,total-Number(match[2]));
 const end=match[1]&&match[2]?Math.min(total-1,Number(match[2])):total-1;
 return Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&start>=0&&start<=end&&end<total?{start,end}:'invalid';
}
