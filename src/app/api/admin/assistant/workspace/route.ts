import { requireAdmin } from '@/lib/auth';
import { AppError, rateLimit } from '@/lib/db';
import { handler, ipKey, json, readJson, sameOrigin } from '@/lib/http';
import { CommerceError } from '@/lib/commerce/model';
import { AnalyticsError } from '@/lib/server/analytics/service';
import { nextWorkspaceBackend } from '@/lib/server/assistant/workspace-next';
import { handleWorkspaceRequest, WorkspaceError } from '@/lib/server/assistant/workspace-core';
import { workspaceProvider } from '@/lib/server/assistant/workspace-provider';
import { workspaceRequestSchema } from '@/lib/assistant/workspace';
import { noteActivity } from '@/lib/team/activity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const GET = handler(async () => {
  const session = await requireAdmin();
  const { backend, aiEnabled } = await nextWorkspaceBackend(session.id);
  return json({
    configured: Boolean(workspaceProvider(aiEnabled)),
    areas: backend.areas,
    actions: backend.actions.map(action => action.info)
  });
});

export const POST = handler(async request => {
  sameOrigin(request);
  const session = await requireAdmin();
  const input = workspaceRequestSchema.parse(await readJson(request, 64000));
  await rateLimit(ipKey(request, 'assistant-workspace:' + input.kind), input.kind === 'ask' ? 8 : 40, 60);
  const { backend, aiEnabled } = await nextWorkspaceBackend(session.id);
  try {
    const result = await handleWorkspaceRequest(backend, input,
      input.kind === 'ask' ? workspaceProvider(aiEnabled) : undefined, request.signal);
    if (input.kind === 'execute') await noteActivity(session,'assistant.executed',undefined,'assistant:' + input.approvalId);
    return json(result);
  } catch (error) {
    if (error instanceof WorkspaceError || error instanceof CommerceError || error instanceof AnalyticsError) {
      throw new AppError(error.message, error.status);
    }
    if (input.kind === 'ask' && !(error instanceof AppError)) throw new AppError('Die Abfrage konnte gerade nicht abgeschlossen werden. Versuchen Sie es erneut oder wählen Sie einen Bereich.', 502);
    throw error;
  }
});
