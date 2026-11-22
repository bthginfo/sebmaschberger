import 'server-only';
import {revalidatePath,revalidateTag} from 'next/cache';

/** Metadata handlers have their own route caches, outside the root layout tree. */
export function revalidatePublishedSite(){
  revalidateTag('ws-published',{expire:0});
  revalidatePath('/','layout');
  revalidatePath('/sitemap.xml');
  revalidatePath('/robots.txt');
  revalidatePath('/llms.txt');
}
