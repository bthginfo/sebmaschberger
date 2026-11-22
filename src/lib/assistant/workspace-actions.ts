import { z } from 'zod';
import { plainAgentText } from '../agents/model';

export const workspaceRecordId = z.string().trim().min(1).max(150).regex(/^[\w.-]+$/);
export const inquiryUpdate = z.object({
  id: workspaceRecordId,
  status: z.enum(['new', 'in-progress', 'done', 'spam']).optional(),
  note: plainAgentText(10000).optional()
}).strict();
export const shopFulfill = z.object({ id: workspaceRecordId, tracking: plainAgentText(500).optional() }).strict();
export const workspaceTarget = z.object({ id: workspaceRecordId }).strict();
export const shopProductFields = z.object({
  title: plainAgentText(180).refine(value => value.trim().length > 0),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: plainAgentText(4000),
  kind: z.enum(['physical', 'digital', 'service']),
  priceCents: z.number().int().min(0).max(100_000_000),
  stock: z.number().int().min(0).max(1_000_000).nullable().optional(),
  groupId: workspaceRecordId.nullable().optional(),
  taxRuleId: workspaceRecordId.nullable().optional(),
  variants: z.array(plainAgentText(150)).max(60).optional(),
  active: z.boolean()
}).strict();
export const shopProductUpdate = shopProductFields.partial().extend({ id: workspaceRecordId }).strict();
export const pageSectionInsert = z.object({
  pageId: workspaceRecordId, type: workspaceRecordId, afterId: workspaceRecordId.optional(),
  heading: plainAgentText(240).optional(), text: plainAgentText(4000).optional()
}).strict();
