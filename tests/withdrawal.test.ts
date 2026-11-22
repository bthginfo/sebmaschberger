import test from 'node:test';
import assert from 'node:assert/strict';
import { withdrawalInput } from '../src/lib/commerce/withdrawal-input';
import { withdrawalReceipt, WITHDRAWAL_DECLARATION } from '../src/lib/commerce/withdrawal';

const input = {
  requestId: '24d72df6-11b0-4f04-a22e-bc5a3dd3534c', name: 'Rosa Testperson',
  email: 'rosa@example.test', contract: 'Bestellung A-42, Artikel 2'
};

test('withdrawal validation accepts partial contract references and rejects hidden or invalid fields', () => {
  assert.deepEqual(withdrawalInput.parse(input), input);
  for (const patch of [{ email: 'keine-adresse' }, { contract: '' }, { website: 'Spam' }, { consent: true }]) {
    assert.equal(withdrawalInput.safeParse({ ...input, ...patch }).success, false);
  }
});

test('the durable confirmation includes the exact declaration, contract and received time', () => {
  const receipt = withdrawalReceipt({
    id: 'widerruf-' + input.requestId, name: input.name, email: input.email,
    message: input.contract, createdAt: '2026-11-05T08:23:42.000Z'
  });
  for (const expected of [input.name, input.email, input.contract, WITHDRAWAL_DECLARATION, '09:23:42', '5. November 2026']) {
    assert(receipt.includes(expected));
  }
});
