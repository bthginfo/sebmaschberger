import { adminMetadata } from '@/lib/admin-i18n/server';
import {notFound} from 'next/navigation';
import {requireOwnerPage} from '@/lib/team/owner-page';
import {getDraftConfig} from '@/lib/db';
import {AdminApp} from '@/components/admin/admin-app';
import {idSchema} from '@/lib/social/model';
export const dynamic='force-dynamic';
export function generateMetadata() {
  return adminMetadata('/admin/social/planner');
}

export default async function PlannerPage({searchParams}:{searchParams:Promise<{project?:string|string[];source?:string|string[]}>}){await requireOwnerPage();const config=await getDraftConfig();if(!config.modules?.socialStudio?.enabled||!config.modules?.socialPublishing?.enabled)notFound();const query=await searchParams,requested=typeof query.project==='string'?idSchema.safeParse(query.project):null,context=typeof query.source==='string'?idSchema.safeParse(query.source):null;return <AdminApp initialView="planner" initialPlannerProject={requested?.success?requested.data:undefined} initialSocialProject={context?.success?context.data:undefined} initialRouteError={query.project&&!requested?.success||query.source&&!context?.success?'Der Link zum Quellentwurf ist ungültig. Wählen Sie im Planer einen Studio-Entwurf.':undefined}/>;}
