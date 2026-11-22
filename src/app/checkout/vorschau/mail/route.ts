import {previewOrderEmail,type DemoQuery} from '@/lib/commerce/preview-data';

export const dynamic='force-dynamic';

export function GET(request:Request) {
  const query:DemoQuery=Object.fromEntries(new URL(request.url).searchParams);
  return previewOrderEmail('de',query);
}
