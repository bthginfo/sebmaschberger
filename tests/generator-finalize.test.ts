import test from 'node:test';
import assert from 'node:assert/strict';
import { finalizeScaffold } from '../scripts/lib/scaffold.mjs';

test('a completed project survives temporary Windows file locks', async () => {
  let attempts = 0;
  const waited: number[] = [];
  const paths: string[][] = [];
  await finalizeScaffold('/projects/.website-starter-stage', '/projects/new', {
    platform: 'win32', occupied: async () => false,
    move: async (source: string, target: string) => {
      paths.push([source, target]);
      if (++attempts < 3) throw Object.assign(new Error('temporarily locked'), { code: 'EPERM' });
    },
    wait: async (ms: number) => { waited.push(ms); }
  });
  assert.equal(attempts, 3);
  assert.deepEqual(waited, [25, 50]);
  assert(paths.every(pair => pair[0] === '/projects/.website-starter-stage' && pair[1] === '/projects/new'));
});

test('a destination created during a retry is preserved', async () => {
  let checks = 0, moves = 0;
  await assert.rejects(finalizeScaffold('/stage', '/new', {
    platform: 'win32', occupied: async () => ++checks > 1,
    move: async () => { moves++; throw Object.assign(new Error('locked'), { code: 'EBUSY' }); },
    wait: async () => {}
  }), { code: 'EEXIST' });
  assert.equal(moves, 1);
});

test('permanent failures and non-Windows errors propagate immediately', async () => {
  for (const [platform, code] of [['linux', 'EPERM'], ['win32', 'EACCES'], ['win32', 'ENOENT']] as const) {
    let moves = 0, waits = 0;
    const failure = Object.assign(new Error('original failure'), { code });
    await assert.rejects(finalizeScaffold('/stage', '/new', {
      platform, occupied: async () => false,
      move: async () => { moves++; throw failure; }, wait: async () => { waits++; }
    }), error => error === failure);
    assert.equal(moves, 1);
    assert.equal(waits, 0);
  }
});

test('persistent Windows locks fail after a bounded retry period', async () => {
  let moves = 0;
  const waited: number[] = [];
  const failure = Object.assign(new Error('still locked'), { code: 'EPERM' });
  await assert.rejects(finalizeScaffold('/stage', '/new', {
    platform: 'win32', occupied: async () => false,
    move: async () => { moves++; throw failure; }, wait: async (ms: number) => { waited.push(ms); }
  }), error => error === failure);
  assert.equal(moves, 7);
  assert.deepEqual(waited, [25, 50, 100, 200, 400, 800]);
});
