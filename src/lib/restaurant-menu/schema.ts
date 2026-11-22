import { z } from 'zod';
import { MENU_LAYOUTS } from './model';

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const name = z.string().max(120);
const description = z.string().max(500);
const price = z.object({ id, label: z.string().max(60), cents: z.number().int().min(0, 'Bitte einen gültigen Preis in Euro angeben.').max(1000000).nullable() }).strict();
const item = z.object({ id, name, description, details: z.string().max(240), visible: z.boolean(), featured: z.boolean(), prices: z.array(price).max(8) }).strict();
const category = z.object({ id, name, description, visible: z.boolean(), items: z.array(item).max(120) }).strict();

function distinct(entries: readonly {id: string}[]) {
  return new Set(entries.map(entry => entry.id)).size === entries.length;
}

export const restaurantMenuSchema = z.object({ enabled: z.boolean(), categories: z.array(category).max(24) }).strict().superRefine((menu, ctx) => {
  const items = menu.categories.flatMap(category => category.items);
  if (!distinct(menu.categories) || !distinct(items) || !items.every(entry => distinct(entry.prices))) {
    ctx.addIssue({ code: 'custom', message: 'Kategorien, Einträge und Preise benötigen eindeutige IDs.' });
  }
  if (items.length > 500) ctx.addIssue({ code: 'custom', message: 'Die Karte kann bis zu 500 Einträge enthalten.' });
});

export const restaurantMenuPlacementSchema = z.object({
  layout: z.enum(MENU_LAYOUTS),
  categoryIds: z.array(id).max(24).optional(),
  limitPerCategory: z.number().int().min(1).max(50).optional(),
}).strict();
