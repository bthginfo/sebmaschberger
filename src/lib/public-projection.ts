import { gzipSync, gunzipSync } from 'node:zlib';
import { publicRestaurantMenu } from './restaurant-menu/model';
import type { SiteConfig, WebsiteContent } from './types';
import { routeTemplateKeyForPath } from './route-template-keys';

export function projectPublicSiteConfig(config: SiteConfig, includeMenu = true): SiteConfig {
  const { defaultAdminLanguage: _privateLanguage, ...publicConfig } = config;
  if (!config.modules?.clubManagement?.enabled) {
    const publicLinks = <T extends { href: string }>(links: T[]) => links.filter(link => !/^\/members(?:[/?#]|$)/u.test(link.href));
    publicConfig.navigation = publicLinks(config.navigation);
    if (config.footer) publicConfig.footer = { ...config.footer, columns: config.footer.columns.map(column => ({ ...column, links: publicLinks(column.links) })) };
    if (config.locales?.en) {
      const en = config.locales.en;
      publicConfig.locales = { ...config.locales, en: { ...en,
        navigation: publicLinks(en.navigation),
        ...(en.footer ? { footer: { ...en.footer, columns: en.footer.columns.map(column => ({ ...column, links: publicLinks(column.links) })) } } : {}),
      } };
    }
  }
  if (publicConfig.modules?.coachStudio) {
    const { coachStudio: _privateCoachStudio, ...publicModules } = publicConfig.modules;
    publicConfig.modules = publicModules;
  }
  const menu = publicConfig.modules?.restaurantMenu;
  const reservations = publicConfig.modules?.reservations;
  if (menu || reservations) {
    publicConfig.modules = { ...publicConfig.modules,
      ...(menu ? { restaurantMenu: includeMenu ? publicRestaurantMenu(menu) : { enabled: menu.enabled, categories: [] } } : {}),
      ...(reservations ? { reservations: { enabled: reservations.enabled } } : {}),
    };
  }
  const commerce = publicConfig.modules?.commerce;
  if (!commerce) return publicConfig;
  return {
    ...publicConfig,
    modules: { ...publicConfig.modules, commerce: { ...commerce, products: commerce.enabled ? commerce.products.filter(product => product.active) : [] } }
  };
}

export function projectPublicContent(content: WebsiteContent, slug?: string): WebsiteContent {
  const blog = content.config.blog;
  const blogRoute = blog?.enabled && (slug === blog.slug || content.posts?.some(post => post.status === 'published' && slug === blog.slug + '/' + post.slug));
  const key = slug === undefined ? undefined : routeTemplateKeyForPath(slug, blogRoute ? blog.slug : undefined);
  const templates: WebsiteContent['templates'] = {};
  for (const [name, template] of Object.entries(content.templates ?? {})) {
    if (slug === undefined || key === name) {
      templates[name as keyof typeof templates] = slug === undefined ? { ...template, sections: [] } : template;
    }
  }
  return {
    templates,
    version: 1,
    config: projectPublicSiteConfig(content.config, slug !== undefined),
    pages: content.pages.filter(page => slug === undefined || page.slug === slug).map(page => slug === undefined ? { ...page, sections: [] } : page),
    posts: blog?.enabled ? (content.posts ?? []).filter(post => post.status === 'published').map(post => ({
      ...post,
      sections: slug === `${blog.slug}/${post.slug}` ? post.sections : [],
    })) : [],
  };
}

// Next's persistent fetch cache limits each entry to 2 MiB. Keep large articles
// cacheable, rather than silently reading them from Postgres on every request.
export function packPublicSnapshot(value: unknown): string {
  return gzipSync(Buffer.from(JSON.stringify(value)), { level: 6 }).toString('base64');
}
export function unpackPublicSnapshot<T>(value: string): T {
  return JSON.parse(gunzipSync(Buffer.from(value, 'base64'), { maxOutputLength: 16 * 1024 * 1024 }).toString('utf8')) as T;
}
