import { z } from 'zod';

export const PROPOSAL_PATH = '/projektfreigabe';
export const proposalZone = 'Europe/Berlin';
const common = { inquiryId: z.uuid(), revision: z.number().int().nonnegative() };
const details = {
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().min(10).max(4000),
  validDays: z.union([z.literal(3),z.literal(7),z.literal(14),z.literal(30)])
};
const proposalDetails = z.discriminatedUnion('kind',[
  z.object({...details,kind:z.literal('offer'),priceCents:z.number().int().min(0).max(99999999)}).strict(),
  z.object({...details,kind:z.literal('appointment'),time:z.string().max(16),minutes:z.number().int().min(15).max(240)}).strict()
]);
export const proposalChange = z.discriminatedUnion('action',[
  z.object({...common,action:z.literal('issue'),proposal:proposalDetails}).strict(),
  z.object({...common,action:z.literal('revoke')}).strict()
]);
export const proposalAccess = z.object({
  key: z.string().regex(/^[a-f0-9-]{36}\.[A-Za-z0-9_-]{43}$/i),
  action: z.enum(['read','accept','decline'])
}).strict();
export type ProposalView = {
  revision: number; status: 'offered'|'accepted'|'declined'|'revoked';
  title: string; description: string; kind:'offer'|'appointment';
  priceCents?: number; startsAt?: string; minutes?: number;
  createdAt: string; expiresAt: string; decidedAt?: string;
};
export type StoredProposal = ProposalView & { tokenHash?: string };
export function proposalView({ tokenHash: _secret, ...view }: StoredProposal): ProposalView { return view; }
export const proposalStatusLabels = {offered:'Zur Freigabe',accepted:'Angenommen',declined:'Abgelehnt',revoked:'Zurückgezogen'};
