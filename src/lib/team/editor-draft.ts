import { isDeepStrictEqual } from 'node:util';
import { AppError } from '../db';
import type { WebsiteContent } from '../types';

export function editorialDraft(current: WebsiteContent, incoming: WebsiteContent) {
  const menu = current.config.modules?.restaurantMenu;
  const incomingMenu = incoming.config.modules?.restaurantMenu;
  const config = menu?.enabled && incomingMenu?.enabled
    ? { ...current.config, modules: { ...current.config.modules, restaurantMenu: { ...menu, categories: incomingMenu.categories } } }
    : current.config;
  if (!isDeepStrictEqual(incoming.config, config)) {
    throw new AppError('Die Redaktion kann Seiten und Beiträge bearbeiten. Einstellungen bleiben dem Inhaber vorbehalten.', 403);
  }
  const statuses = new Map(current.posts?.map(post => [post.id, post.status]));
  return { ...incoming, config, posts: incoming.posts?.map(post => ({ ...post, status: statuses.get(post.id) ?? 'draft' as const })) };
}
