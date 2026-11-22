export type WorkspaceAppScope = 'cms' | 'member';
export const WORKSPACE_PUSH_CATEGORIES = ['messages', 'schedule', 'news', 'tactics', 'inquiries'] as const;
export type WorkspacePushCategory = (typeof WORKSPACE_PUSH_CATEGORIES)[number];
export type WorkspacePushPreferences = Record<WorkspacePushCategory, boolean>;
export const DEFAULT_PUSH_PREFERENCES: WorkspacePushPreferences = {
  messages: true, schedule: true, news: false, tactics: true, inquiries: true,
};

export const workspaceAppPath = (scope: WorkspaceAppScope) => scope === 'cms' ? '/admin' : '/members';
