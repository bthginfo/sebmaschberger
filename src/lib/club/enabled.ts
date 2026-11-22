import 'server-only';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { getDraftConfig } from '@/lib/db';

export const clubFeatures = cache(async () => {
  const config = await getDraftConfig();
  const enabled = config.modules?.clubManagement?.enabled === true;
  return { enabled, coachStudio: enabled && config.modules?.coachStudio?.enabled === true, brandName: config.name || 'Website' };
});

export async function requireClubPage(tactics = false) {
  const feature = await clubFeatures();
  if (!feature.enabled || tactics && !feature.coachStudio) notFound();
  return feature;
}
