import { adminMetadata } from '@/lib/admin-i18n/server';
import {notFound} from 'next/navigation';
import {requireOwnerPage} from '@/lib/team/owner-page';
import {getState} from '@/lib/db';
import {AdminApp} from '@/components/admin/admin-app';
import {idSchema} from '@/lib/social/model';

export const dynamic='force-dynamic';

export function generateMetadata() {
  return adminMetadata('/admin/social');
}

export default async function SocialPage({searchParams}:{searchParams:Promise<{project?:string|string[]}>}){
 await requireOwnerPage();
 const state=await getState();
 if(state.draft.config.modules?.socialStudio?.enabled!==true)notFound();
 const query=await searchParams,requested=typeof query.project==='string'?idSchema.safeParse(query.project):null;
 return <AdminApp initialView="social" initialSocialProject={requested?.success?requested.data:undefined} initialRouteError={query.project&&!requested?.success?'Der Link zum Social-Entwurf ist ungültig. Öffnen Sie einen gespeicherten Entwurf aus der Bibliothek.':undefined}/>;
}
