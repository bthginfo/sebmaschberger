import { z } from 'zod';
import { AppError, rateLimit } from '@/lib/db';
import { handler, ipKey, json, readJson, sameOrigin } from '@/lib/http';
import { readOutcomeProof } from '@/lib/server/analytics/outcome-proof';
import { AnalyticsError } from '@/lib/server/analytics/service';
import { analytics } from '@/lib/server/analytics/store';

export const dynamic = 'force-dynamic';
const input = z.object({ token:z.string().min(50).max(1400), pageId:z.uuid(), proof:z.string().max(370) }).strict();

export const POST = handler(async request => {
  sameOrigin(request);
  await rateLimit(ipKey(request,'statistics-outcome'),30,60);
  const values = input.parse(await readJson(request,3000));
  const outcome = readOutcomeProof(values.proof);
  if (!outcome) throw new AppError('Dieser Vorgang konnte nicht bestätigt werden.',403);
  try { await analytics.recordOutcome(values.token,values.pageId,outcome); }
  catch (error) { if (error instanceof AnalyticsError) throw new AppError(error.message,error.status); throw error; }
  return json({ok:true});
});
