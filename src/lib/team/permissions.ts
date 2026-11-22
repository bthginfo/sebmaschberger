import type { AdminRole } from '../auth-session';

export const workspaceRoles = ['owner', 'editor', 'shop'] as const;
const editorViews = new Set(['editor', 'blog', 'templates', 'media', 'restaurant-menu']);

export function workspaceHome(role: AdminRole) {
  return role === 'editor' ? 'editor' : role === 'shop' ? 'commerce' : 'dashboard';
}

export function canOpenWorkspace(role: AdminRole, view: string) {
  return role === 'owner' || view === 'account' || (role === 'editor' ? editorViews.has(view) : view === 'commerce');
}

export function canUseAdminAction(role: AdminRole, action: string, method: string) {
  if (role === 'owner') return true;
  if ((action === 'bootstrap' && method === 'GET') || (['logout', 'password'].includes(action) && method === 'POST')) return true;
  return role === 'editor' && ((action === 'content' && method === 'PUT') ||
    (action === 'media' && ['GET', 'POST', 'PATCH'].includes(method)));
}
