import 'server-only';
import { notFound } from 'next/navigation';
import { clubRecordRef } from '@/lib/club/records';
import { clubWorkspace } from '@/lib/club/workspace';
import type { ClubActor } from '@/lib/club/model';
import { ClubAdmin } from './club-admin';

export async function ClubRecordPage({ actor, params }: { actor: ClubActor; params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  const detail = clubRecordRef(kind, id);
  if (!detail) notFound();
  const initial = await clubWorkspace(actor, 'manage');
  if (!initial[detail.kind].some(item => item.id === detail.id)) notFound();
  return <ClubAdmin initial={initial} initialDetail={detail} />;
}
