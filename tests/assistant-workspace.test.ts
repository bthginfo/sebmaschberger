import test from 'node:test';
import assert from 'node:assert/strict';
import { MockLanguageModelV3 } from 'ai/test';
import { z } from 'zod';
import {
  handleWorkspaceRequest, WorkspaceError, type ApprovalRecord, type WorkspaceBackend
} from '../src/lib/server/assistant/workspace-core';

function fixture() {
  const records = new Map<string, ApprovalRecord>();
  const executed: string[] = [];
  const queries: string[] = [];
  const backend: WorkspaceBackend = {
    owner: 'owner:session-a',
    areas: [{ id: 'invoices', label: 'Rechnungen', href: '/admin/rechnungen', description: 'Rechnungsdaten' }],
    actions: [{
      info: { id: 'invoice.issue', area: 'invoices', label: 'Rechnung ausstellen', effect: 'Erstellt den Beleg.' },
      schema: z.object({ id: z.string() }).strict(),
      prepare: async payload => ({ payload, fields: [{ label: 'Betrag', value: '119,00 €' }] }),
      execute: async (_payload, key) => {
        executed.push(key);
        return { message: 'Rechnung ausgestellt.' };
      }
    }],
    read: async query => {
      queries.push(query.area);
      return { area: backend.areas[0], total: 1, rows: [{ id: 'fixture', label: 'Testrechnung', fields: [{ label: 'Betrag', value: '119,00 €' }] }] };
    },
    store: async (id, mutate) => {
      const record = mutate(records.get(id) || null);
      records.set(id, record);
      return record;
    }
  };
  return { backend, records, executed, queries };
}

test('an approved operation is session-bound and a repeat returns the original result', async () => {
  const { backend, executed, records } = fixture();
  const approval = await handleWorkspaceRequest(backend, { kind: 'prepare', action: 'invoice.issue', input: { id: 'fixture' } });
  assert.ok('id' in approval);
  assert.equal(executed.length, 0);
  const request = { kind: 'execute', approvalId: approval.id };
  await assert.rejects(handleWorkspaceRequest({ ...backend, owner: 'owner:session-b' }, request), /nicht verfügbar/);
  const first = await handleWorkspaceRequest(backend, request);
  assert.deepEqual(await handleWorkspaceRequest(backend, request), first);
  assert.equal(executed.length, 1);
  assert.equal(records.get(approval.id)?.payload, undefined);
});

test('unknown operations and expired approvals fail before executing', async () => {
  const { backend, executed, records } = fixture();
  await assert.rejects(handleWorkspaceRequest(backend, { kind: 'prepare', action: 'credentials.dump', input: {} }), WorkspaceError);
  const approval = await handleWorkspaceRequest(backend, { kind: 'prepare', action: 'invoice.issue', input: { id: 'fixture' } });
  assert.ok('id' in approval);
  records.get(approval.id)!.expiresAt = new Date(0).toISOString();
  await assert.rejects(handleWorkspaceRequest(backend, { kind: 'execute', approvalId: approval.id }), /abgelaufen/);
  assert.equal(executed.length, 0);
});

test('the installed AI SDK reads live data and prepares a card without executing it', async () => {
  const { backend, executed, queries } = fixture();
  const usage = {
    inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
    outputTokens: { total: 10, text: 10, reasoning: undefined }
  };
  const model = new MockLanguageModelV3({
    doGenerate: [
      {
        content: [{ type: 'tool-call', toolCallId: 'read-1', toolName: 'cms_lesen', input: JSON.stringify({ area: 'invoices', id: 'fixture' }) }],
        finishReason: { unified: 'tool-calls', raw: undefined }, usage, warnings: []
      },
      {
        content: [{ type: 'tool-call', toolCallId: 'prepare-1', toolName: 'aktion_vorbereiten',
          input: JSON.stringify({ action: 'invoice.issue', inputJson: JSON.stringify({ id: 'fixture' }) }) }],
        finishReason: { unified: 'tool-calls', raw: undefined }, usage, warnings: []
      },
      {
        content: [{ type: 'text', text: 'Testrechnung über 119,00 € zur Prüfung vorbereitet.' }],
        finishReason: { unified: 'stop', raw: undefined }, usage, warnings: []
      }
    ]
  });
  const response = await handleWorkspaceRequest(backend, { kind: 'ask', question: 'Stelle die Testrechnung aus.' }, { model, provider: 'anthropic' });
  assert.ok('sources' in response);
  assert.equal(response.sources[0].total, 1);
  assert.equal(response.approval?.title, 'Rechnung ausstellen');
  assert.deepEqual(queries, ['invoices']);
  assert.deepEqual(executed, []);
});

test('guided mode uses the current record store and identifies overdue invoices', async () => {
  const { backend, queries } = fixture();
  const original = backend.read;
  backend.read = query => {
    assert.equal(query.status, 'overdue');
    return original(query);
  };
  const response = await handleWorkspaceRequest(backend, { kind: 'ask', question: 'Welche Rechnungen sind überfällig?' });
  assert.ok('mode' in response);
  assert.equal(response.mode, 'guided');
  assert.equal(response.sources[0].rows[0].label, 'Testrechnung');
  assert.deepEqual(queries, ['invoices']);
});
