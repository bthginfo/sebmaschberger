import { adminMetadata } from '@/lib/admin-i18n/server';
import {requireOwnerPage} from '@/lib/team/owner-page';
import {AdminApp} from '@/components/admin/admin-app';
export function generateMetadata() {
  return adminMetadata('/admin/vorlagen');
}

export default async function TemplatesPage(){await requireOwnerPage();return <AdminApp initialView="documents"/>;}
