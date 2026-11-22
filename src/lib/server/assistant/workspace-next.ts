import 'server-only';
import { getDraftConfig, mutateRecord, pruneModuleRecords } from '@/lib/db';
import { nextWorkspaceAreas, readNextWorkspace } from './workspace-next-read';
import { nextWorkspaceActions } from './workspace-next-actions';
import { nextSocialWorkspace } from './workspace-next-social';
import type { ApprovalRecord, WorkspaceBackend } from './workspace-core';

export async function nextWorkspaceBackend(owner: string): Promise<{ backend: WorkspaceBackend; aiEnabled: boolean }> {
  const config = await getDraftConfig();
  const social = nextSocialWorkspace(config);
  return {
    aiEnabled: config.modules?.aiAssistant?.enabled === true,
    backend: {
      owner,
      areas: [...nextWorkspaceAreas(config), ...social.areas],
      actions: [...nextWorkspaceActions(config), ...social.actions],
      read: query => social.areas.some(area => area.id === query.area) ? social.read(query) : readNextWorkspace(query),
      store: async (id, change) => (await mutateRecord<ApprovalRecord | null>('assistant-approvals', id, null, change))!
    }
  };
}

export const cleanupAssistantApprovals = () =>
  pruneModuleRecords('assistant-approvals', new Date(Date.now() - 86400000).toISOString(), 'at');
