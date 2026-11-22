import {AppError} from '@/lib/db';
import {handler} from '@/lib/http';
import {authorizeProviderMedia} from '@/lib/server/social/publishing/media-read';
import {publishingMediaResponse} from '@/lib/server/social/publishing/signed-media';
import {PlannerError} from '@/lib/server/social/publishing/types';
export const runtime='nodejs';export const dynamic='force-dynamic';
const route=handler(async(request:Request)=>{try{return publishingMediaResponse(await authorizeProviderMedia(new URL(request.url)),request);}catch(error){if(error instanceof PlannerError)throw new AppError(error.message,error.status);throw error;}});export{route as GET,route as HEAD};
