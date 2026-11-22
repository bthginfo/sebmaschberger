import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { makeCoachHtml } from '../src/lib/coach/exports';
import { applyCoachAssistantAnswer, coachAssistantRequestSchema } from '../src/lib/coach/assistant';
import { frameAt, frameTimes, makeCoachPlay, playDuration } from '../src/lib/coach/model';
import { coachTracks, sampleCoachPieces, sampleCoachTrack } from '../src/lib/coach/motion';
import { coachTemplates, localizeCoachPreset } from '../src/lib/coach/presets';
import { renderCoachBoard } from '../src/lib/coach/scene';
import { coachPlaySchema } from '../src/lib/coach/validation';

test('Rugby presets validate in German and English and interpolate shared players', () => {
  for (const locale of ['de', 'en'] as const) {
    const templates = coachTemplates(locale);
    assert.equal(templates.length, 5);
    for (const template of templates) assert.equal(coachPlaySchema.parse(template).locale, locale);
  }

  const play = coachTemplates()[0];
  assert.deepEqual(frameTimes(play), [0, 2.5, 3.75, 5.25, 7.5]);
  assert.equal(frameAt(play, 2.5), 1);
  assert.equal(sampleCoachPieces(play, 1.5).find(piece => piece.id === '10')?.x, 410.5);
  assert.equal(sampleCoachPieces(play, 2.5).find(piece => piece.id === '10')?.x, 511);
  assert.equal(sampleCoachPieces(play, 2.5).some(piece => piece.id === 'carry'), false);
});

test('untouched presets use the workspace language, even with reordered database keys and a later revision', () => {
  const german = coachTemplates('de')[0];
  const reordered = JSON.parse(JSON.stringify(german, (_, value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    return Object.fromEntries(Object.entries(value).reverse());
  }));
  const record = { id: 'preset', revision: 2, updatedAt: '', play: reordered };
  const english = localizeCoachPreset(record, 'en');
  assert.deepEqual(english, coachTemplates('en')[0]);
  assert.equal(english.title, '3 v 2 on the wing');
  assert.equal(english.frames[0].items.find(item => item.id === 'channel')?.label, 'Scoring zone');
  assert.equal(english.plan?.players, '3 attackers, 2 defenders');
  assert.deepEqual(localizeCoachPreset({ ...record, play: english }, 'de'), german);
  assert.equal(localizeCoachPreset(record, 'de'), record.play);
});

test('the workspace language leaves an edited play or an unsaved draft intact', () => {
  const original = coachTemplates('de')[0];
  const record = { id: 'preset', revision: 1, updatedAt: '', play: original };
  const edited = structuredClone(original);
  edited.frames[0].items.find(item => item.id === 'channel')!.label = 'Unser Korridor';
  assert.equal(localizeCoachPreset({ ...record, play: edited }, 'en'), edited);

  const draft = { ...original, description: 'Unser eigener Trainingsplan' };
  assert.equal(localizeCoachPreset(record, 'en', draft), draft);
  assert.equal(localizeCoachPreset(record, 'en', structuredClone(original)).locale, 'de');
});

test('board validation rejects duplicate phase objects and out-of-bounds coordinates', () => {
  const play = coachTemplates()[0];
  play.frames[0].items.push(play.frames[0].items[0]);
  assert.equal(coachPlaySchema.safeParse(play).success, false);

  const outOfBounds = coachTemplates()[0];
  outOfBounds.frames[0].items[0].x = 1001;
  assert.equal(coachPlaySchema.safeParse(outOfBounds).success, false);
});

test('phase holds, transition curves, ball flights and planning data round-trip', () => {
  const play = makeCoachPlay('en');
  play.plan = { objective: 'Keep the outside channel open', players: '3 v 2', minutes: 12 };
  play.frames = [{
    ...play.frames[0], seconds: 2, hold: 1, transition: 'linear', ballFlight: 'kick',
    items: [
      { id: 'ball', kind: 'ball', x: 100, y: 100, label: '' },
      { id: 'ring', kind: 'ring', x: 250, y: 225, width: 130, height: 85, label: 'Target' },
      { id: 'gate', kind: 'gate', x: 300, y: 150, angle: -45, tone: 'violet', label: '' },
    ],
  }, {
    id: 'finish', title: 'Catch', notes: '', seconds: 2, hold: .75,
    items: [
      { id: 'ball', kind: 'ball', x: 300, y: 150, label: '' },
      { id: 'gate', kind: 'gate', x: 340, y: 150, angle: 45, tone: 'violet', label: '' },
    ],
  }];
  assert.deepEqual(coachPlaySchema.parse(play), play);
  assert.deepEqual(frameTimes(play), [0, 3]);
  assert.equal(playDuration(play), 3.75);
  assert.equal(sampleCoachPieces(play, .5)[0].x, 100);
  assert.equal(sampleCoachPieces(play, 2)[0].x, 200);
  const track = coachTracks(play, 0).find(value => value.id === 'ball');
  assert(track);
  assert.equal(track.mode, 'kick');
  assert(sampleCoachTrack(track, .5).altitude > 50);
  assert.equal(sampleCoachTrack(track, 0).altitude, 0);
  assert.equal(sampleCoachTrack(track, 1).altitude, 0);
  assert.equal(sampleCoachPieces(play, 2).find(value => value.id === 'gate')?.angle, 0);
  assert.match(renderCoachBoard(play, 2, { variant: 'play' }), /data-motion-landing="ball"/u);
  assert.match(makeCoachHtml(play), /Keep the outside channel open/u);
});

test('saved coaching text stays inert in SVG and the offline HTML payload', () => {
  const play = coachTemplates()[0];
  const payload = '</script><script>globalThis.injected=1</script>';
  play.title = payload;
  play.frames[0].notes = payload;
  play.frames[0].items[0].label = '<img onerror=alert(1)>';
  assert(!renderCoachBoard(play).includes('<img'));

  const html = makeCoachHtml(play);
  assert(!html.includes(payload));
  assert(html.includes('&lt;/script&gt;'));
  const scriptData = html.match(/<script id="data" type="application\/json">(.*?)<\/script>/s)?.[1];
  assert(scriptData);
  assert.equal(JSON.parse(scriptData).frames[0].notes, payload);
});

test('standalone export binds and animates the board without a module runtime', () => {
  const play = coachTemplates('en')[0];
  const html = makeCoachHtml(play);
  const data = html.match(/<script id="data" type="application\/json">(.*?)<\/script>/s)?.[1];
  const script = html.match(/<script>(.*?)<\/script>/s)?.[1];
  assert(data && script);

  const handlers = new Map<string, () => void>();
  const controls = Object.fromEntries(['pitch', 'play', 'position', 'speed', 'previous', 'next', 'loop', 'phase', 'notes', 'time']
    .map(id => [id, {
      value: '', textContent: '', setAttribute() {},
      addEventListener(event: string, handle: () => void) { handlers.set(id + ':' + event, handle); },
    }]));
  const attrs = new Map<string, string>();
  const player = {
    getAttribute: () => '10',
    querySelector: () => null,
    setAttribute: (key: string, value: string) => attrs.set(key, value),
  };
  Object.assign(controls.pitch, { querySelectorAll: (selector: string) => selector === '[data-piece-id]' ? [player] : [] });
  runInNewContext(script, {
    document: { getElementById: (id: string) => id === 'data' ? { textContent: data } : controls[id], querySelectorAll: () => [] },
    matchMedia: () => ({ matches: false }),
    cancelAnimationFrame() {},
  });
  const initial = attrs.get('transform');
  assert(initial);
  controls.position.value = '1.5';
  handlers.get('position:input')?.();
  assert.match(attrs.get('transform') ?? '', /^translate\(410\.5 /u);
  assert.notEqual(attrs.get('transform'), initial);
});

test('assistant changes produce a reviewable copy of one board', () => {
  const original = makeCoachPlay('en');
  const result = applyCoachAssistantAnswer(original, {
    reply: 'Set up the passing channel and add the next phase.',
    changes: [
      { type: 'details', title: 'Passing channel', description: null, category: null, pitch: null },
      { type: 'add-piece', phaseId: 'setup', id: 'wing', kind: 'attack', label: '14', x: 200, y: 300,
        x2: null, y2: null, width: null, height: null, curve: null, tone: 'sky', angle: null },
      { type: 'add-phase', id: 'catch', after: 'setup', title: 'Catch and run', notes: 'Hold width',
        seconds: 2, hold: 1, transition: 'smooth', ballFlight: 'auto' },
      { type: 'move-piece', phaseId: 'catch', id: 'wing', x: 360, y: 300, x2: null, y2: null },
    ],
  });
  assert.equal(result.changeCount, 4);
  assert.equal(result.play?.title, 'Passing channel');
  assert.equal(result.play?.frames[0].items[0].x, 200);
  assert.equal(result.play?.frames[1].items[0].x, 360);
  assert.equal(original.frames.length, 1);
  assert.equal(original.frames[0].items.length, 0);
  assert.throws(() => applyCoachAssistantAnswer(original, { reply: 'Publish', changes: [{ type: 'publish' }] }));
  assert.throws(() => applyCoachAssistantAnswer(original, { reply: 'Remove', changes: [{ type: 'remove-phase', phaseId: 'missing' }] }));
  assert.equal(coachAssistantRequestSchema.safeParse({ message: 'Check the drill', language: 'en', draft: original }).success, false);
});
