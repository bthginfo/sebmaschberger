export const MENU_LAYOUTS = ['full', 'compact', 'feature'] as const;
export type MenuLayout = typeof MENU_LAYOUTS[number];
export type MenuPrice = { id: string; label: string; cents: number | null };
export type MenuItem = { id: string; name: string; description: string; details: string; visible: boolean; featured: boolean; prices: MenuPrice[] };
export type MenuCategory = { id: string; name: string; description: string; visible: boolean; items: MenuItem[] };
export type RestaurantMenu = { enabled: boolean; categories: MenuCategory[] };
export type MenuPlacement = { layout: MenuLayout; categoryIds?: string[]; limitPerCategory?: number };
export type MenuSelection = { categoryId: string; itemId?: string };

export const emptyMenu: RestaurantMenu = { enabled: true, categories: [] };

export function selectMenuCategories(menu: RestaurantMenu | undefined, placement: MenuPlacement): MenuCategory[] {
  if (!menu?.enabled) return [];
  const selected = new Set(placement.categoryIds);
  return menu.categories
    .filter(category => category.visible && category.name.trim() && (!selected.size || selected.has(category.id)))
    .map(category => {
      const items = category.items.filter(item => item.visible && item.name.trim());
      if (placement.layout === 'feature' && items.some(item => item.featured)) {
        items.sort((a, b) => Number(b.featured) - Number(a.featured));
      }
      const limit = placement.limitPerCategory ?? (placement.layout === 'full' ? items.length : 3);
      return { ...category, items: items.slice(0, limit) };
    })
    .filter(category => category.items.length > 0);
}

export function publicRestaurantMenu(menu: RestaurantMenu): RestaurantMenu {
  return { enabled: menu.enabled, categories: selectMenuCategories(menu, { layout: 'full' }) };
}

export function formatMenuPrice(cents: number, language: 'de' | 'en') {
  return new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'en-IE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}
