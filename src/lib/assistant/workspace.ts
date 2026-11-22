import { z } from 'zod';

const identifier = z.string().trim().min(1).max(160).regex(/^[\w:/.-]+$/);
export const workspaceQuerySchema = z.object({
  area: identifier,
  search: z.string().trim().max(180).optional(),
  id: identifier.optional(),
  sectionId: identifier.optional(),
  stage: z.enum(['draft', 'published']).optional(),
  status: z.string().trim().max(60).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  limit: z.number().int().min(1).max(15).optional()
}).strict().refine(query => !query.from || !query.to || query.from <= query.to, {
  message: 'Das Startdatum muss vor dem Enddatum liegen.'
});

export const workspaceRequestSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('ask'),
    question: z.string().trim().min(2).max(2000),
    area: identifier.optional(),
    history: z.array(z.object({
      question: z.string().max(2000),
      answer: z.string().max(4000)
    }).strict()).max(4).optional()
  }).strict(),
  z.object({ kind: z.literal('read'), query: workspaceQuerySchema }).strict(),
  z.object({ kind: z.literal('prepare'), action: identifier, input: z.record(z.string(), z.unknown()) }).strict(),
  z.object({ kind: z.literal('execute'), approvalId: z.uuid() }).strict()
]);

export type WorkspaceQuery = z.infer<typeof workspaceQuerySchema>;
export type WorkspaceRequest = z.infer<typeof workspaceRequestSchema>;
export type WorkspaceValue = string | number | boolean | null;
export type WorkspaceField = { label: string; value: WorkspaceValue };
export type WorkspaceArea = { id: string; label: string; href: string; description: string };
export type WorkspaceActionInfo = { id: string; label: string; area: string; effect: string };
export type WorkspaceRow = {
  id: string;
  label: string;
  status?: string;
  date?: string;
  href?: string;
  fields: WorkspaceField[];
};
export type WorkspaceFacts = {
  area: WorkspaceArea;
  total: number;
  rows: WorkspaceRow[];
  totals?: WorkspaceField[];
  limited?: boolean;
};
export type WorkspaceApproval = {
  id: string;
  title: string;
  effect: string;
  fields: WorkspaceField[];
  expiresAt: string;
};
export type WorkspaceResult = { message: string; href?: string };
export type WorkspaceReply = {
  answer: string;
  sources: WorkspaceFacts[];
  approval?: WorkspaceApproval;
  mode: 'connected' | 'guided';
};
export type WorkspaceCatalog = {
  areas: WorkspaceArea[];
  actions: WorkspaceActionInfo[];
  configured: boolean;
};
