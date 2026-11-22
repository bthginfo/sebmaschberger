import 'server-only';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { AppError, getDraftConfig } from '@/lib/db';
import { handler } from '@/lib/http';
import type { SiteConfig } from '@/lib/types';

export function coachStudioEnabledIn(config: Pick<SiteConfig, 'modules'>) {
  return config.modules?.coachStudio?.enabled === true;
}

export const coachStudioEnabled = cache(async () => coachStudioEnabledIn(await getDraftConfig()));

export async function requireCoachStudioPage() {
  if (!await coachStudioEnabled()) notFound();
}

export async function requireCoachStudioEnabled() {
  if (!await coachStudioEnabled()) throw new AppError('Coach Studio ist nicht verfügbar.', 404);
}

export function coachRoute(action: (request: Request) => Promise<Response>) {
  return handler(async request => {
    await requireCoachStudioEnabled();
    return action(request);
  });
}
