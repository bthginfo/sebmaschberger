import 'server-only';
import { randomUUID } from 'node:crypto';
import { AppError, mutateRecord, updateExistingRecord } from '../db';
import { digest } from '../security';
import { sendWithdrawalReceipt } from '../mail';
import type { Inquiry } from '../types';
import { withdrawalReceipt } from './withdrawal';
import type { WithdrawalInput } from './withdrawal-input';

type Withdrawal = Inquiry & {
  kind: 'withdrawal';
  submissionHash: string;
  receiptLease?: { id: string; until: number };
};

export async function deliverWithdrawalReceipt(id: string) {
  const leaseId = randomUUID(), now = Date.now();
  const claimed = await updateExistingRecord<Withdrawal>('inquiries', id, record => {
    if (record.kind !== 'withdrawal') throw new AppError('Dieser Widerruf wurde nicht gefunden.', 404);
    if (record.emailStatus === 'sent' || (record.receiptLease?.until ?? 0) > now) return record;
    return { ...record, emailStatus: 'pending', receiptLease: { id: leaseId, until: now + 90000 } };
  });
  if (!claimed) throw new AppError('Dieser Widerruf wurde nicht gefunden.', 404);
  if (claimed.receiptLease?.id !== leaseId) return claimed;
  let status: Inquiry['emailStatus'] = 'failed';
  try {
    status = await sendWithdrawalReceipt(claimed);
  } catch {
    // The declaration remains received and can be confirmed again from the inbox.
  }
  return await updateExistingRecord<Withdrawal>('inquiries', id, record =>
    record.receiptLease?.id === leaseId ? { ...record, emailStatus: status, receiptLease: undefined } : record
  ) ?? { ...claimed, emailStatus: status };
}

export async function receiveWithdrawal(input: WithdrawalInput) {
  const id = 'widerruf-' + input.requestId;
  const submissionHash = digest(JSON.stringify([input.name, input.email, input.contract]));
  const entry: Withdrawal = {
    id, kind: 'withdrawal', submissionHash, name: input.name, email: input.email, phone: '',
    subject: 'Vertrag widerrufen', message: input.contract, createdAt: new Date().toISOString(),
    status: 'new', note: '', emailStatus: 'pending'
  };
  await mutateRecord<Withdrawal>('inquiries', id, entry, current => {
    if (current.kind !== 'withdrawal' || current.submissionHash !== submissionHash) {
      throw new AppError('Dieser Vorgang wurde bereits mit anderen Angaben erfasst. Bitte öffnen Sie das Formular neu.', 409);
    }
    return current;
  });
  const result = await deliverWithdrawalReceipt(id);
  return { id, receivedAt: result.createdAt, confirmation: withdrawalReceipt(result), delivery: result.emailStatus };
}
