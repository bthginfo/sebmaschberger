import { adminMetadata } from '@/lib/admin-i18n/server';
import {requireOwnerPage} from '@/lib/team/owner-page';
import {AdminApp} from '@/components/admin/admin-app';
export function generateMetadata() {
  return adminMetadata('/admin/agents');
}

export default async function Page(){await requireOwnerPage();return <AdminApp initialView='agents'/>;}
