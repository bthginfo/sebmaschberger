import { requireAdmin } from '@/lib/auth';
import { coachRoute } from '@/lib/coach/enabled';
import { rateLimit } from '@/lib/db';
import { ipKey, json, readJson, sameOrigin } from '@/lib/http';
import { coachAssistantRequestSchema } from '@/lib/coach/assistant';
import { createCoachAssistantProposal } from '@/lib/server/assistant/coach';

export const POST = coachRoute(async request => {
  sameOrigin(request);
  await requireAdmin();
  await rateLimit(ipKey(request, 'coach-assistant'), 16, 3600);
  const input = coachAssistantRequestSchema.parse(await readJson(request, 900_000));
  return json({ result: await createCoachAssistantProposal(input, request.signal) });
});
