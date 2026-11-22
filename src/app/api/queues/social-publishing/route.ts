import {handlePublishingCallback} from '@/lib/server/social/publishing/queue';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
export const POST=handlePublishingCallback;
