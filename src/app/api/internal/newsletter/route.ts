import {newsletterWorker} from '@/lib/server/newsletter/queue';
export const runtime='nodejs';
export const maxDuration=60;
export function POST(request: Request) {
  return newsletterWorker(request);
}
