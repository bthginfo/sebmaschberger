import type { Inquiry } from './types';
import { proposalView, type StoredProposal } from './proposals/model';

type StoredInquiry = Inquiry & { proposal?: StoredProposal; receiptLease?: unknown; submissionHash?: string };

export function adminInquiry({ receiptLease: _lease, submissionHash: _submission, proposal, ...data }: StoredInquiry): Inquiry {
  return { ...data, ...(proposal ? { proposal: proposalView(proposal) } : {}) };
}
