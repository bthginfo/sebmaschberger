import { frameTimes, movesBetweenPhases, type CoachFrame, type CoachKind, type CoachPiece, type CoachPlay, type CoachTransition } from './model';

type MotionMode = 'runner' | 'ground' | 'pass' | 'kick';

export interface CoachTrack {
  id: string;
  kind: CoachKind;
  mode: MotionMode;
  transition: CoachTransition;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  bendX: number;
  bendY: number;
  angle: number;
  angleChange: number;
  lift: number;
}

type Point = { x: number; y: number };

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function matchingRoute(frame: CoachFrame, from: Point, to: Point, kinds: readonly CoachKind[]) {
  let match: CoachPiece | undefined;
  let best = 180;
  for (const piece of frame.items) {
    if (!kinds.includes(piece.kind) || piece.x2 === undefined || piece.y2 === undefined) continue;
    const start = distance(piece, from);
    const finish = distance({ x: piece.x2, y: piece.y2 }, to);
    if (start > 105 || finish > 115 || start + finish >= best) continue;
    match = piece;
    best = start + finish;
  }
  return match;
}

function isPlayer(piece: CoachPiece) {
  return piece.kind === 'attack' || piece.kind === 'defence';
}

function carrier(frame: CoachFrame, ball: CoachPiece) {
  let result: CoachPiece | undefined;
  let nearest = 44;
  for (const player of frame.items) {
    if (!isPlayer(player)) continue;
    const separation = distance(ball, player);
    if (separation >= nearest) continue;
    result = player;
    nearest = separation;
  }
  return result;
}

export function coachTracks(play: CoachPlay, index: number): CoachTrack[] {
  const frame = play.frames[index];
  const next = play.frames[index + 1];
  if (!frame || !next) return [];
  const targets = new Map(next.items.map(item => [item.id, item]));

  return frame.items.flatMap(from => {
    const to = targets.get(from.id);
    if (to?.kind !== from.kind || !movesBetweenPhases(from.kind)) return [];
    const length = distance(from, to);
    const angle = from.angle ?? 0;
    const angleChange = ((to.angle ?? 0) - angle + 540) % 360 - 180;
    if (length < 0.01 && angleChange === 0) return [];

    let mode: MotionMode = isPlayer(from) ? 'runner' : 'ground';
    let bend = isPlayer(from) ? matchingRoute(frame, from, to, ['run'])?.curve ?? 0 : 0;
    let lift = 0;
    if (from.kind === 'ball') {
      const before = carrier(frame, from);
      const after = carrier(next, to);
      const carried = before && after && before.id === after.id;
      const route = matchingRoute(frame, from, to, ['pass', 'kick']);
      const chosen = frame.ballFlight ?? 'auto';
      if (chosen === 'auto') {
        if (route?.kind === 'kick') mode = 'kick';
        else if (route?.kind === 'pass' || (!carried && length >= 55)) mode = 'pass';
      } else {
        mode = chosen;
      }
      bend = carried && mode === 'ground'
        ? matchingRoute(frame, before, after, ['run'])?.curve ?? 0
        : route?.curve ?? 0;
      if (mode === 'pass') lift = Math.min(34, 12 + length * .09);
      if (mode === 'kick') lift = Math.min(88, 36 + length * .14);
    }

    const divisor = length || 1;
    return [{
      id: from.id,
      kind: from.kind,
      mode,
      transition: frame.transition ?? 'smooth',
      fromX: from.x,
      fromY: from.y,
      toX: to.x,
      toY: to.y,
      bendX: -(to.y - from.y) / divisor * bend,
      bendY: (to.x - from.x) / divisor * bend,
      angle,
      angleChange,
      lift,
    }];
  });
}

export function coachMotionProgress(time: number, start: number, hold: number, seconds: number) {
  return Math.max(0, Math.min(1, (time - start - hold) / seconds));
}

/** The offline player embeds this sampler. Keep it self-contained. */
export function sampleCoachTrack(track: CoachTrack, progress: number) {
  const step = Math.max(0, Math.min(1, progress));
  const progressOnPath = track.transition === 'linear' ? step
    : track.transition === 'quick' ? 1 - (1 - step) ** 3
    : step * step * (3 - 2 * step);
  const curve = 2 * (1 - progressOnPath) * progressOnPath;
  const altitude = step > 0 && step < 1 ? Math.sin(Math.PI * progressOnPath) * track.lift : 0;
  const spin = track.mode === 'kick' ? 720 : track.mode === 'pass' ? 360 : 0;
  return {
    x: track.fromX + (track.toX - track.fromX) * progressOnPath + track.bendX * curve,
    y: track.fromY + (track.toY - track.fromY) * progressOnPath + track.bendY * curve,
    angle: track.angle + track.angleChange * progressOnPath,
    altitude,
    rotation: -32 + spin * progressOnPath,
  };
}

export function sampleCoachPieces(play: CoachPlay, time: number): CoachPiece[] {
  const starts = frameTimes(play);
  const index = Math.max(0, starts.findLastIndex(start => start <= time));
  const frame = play.frames[index];
  if (!frame) return [];
  const progress = coachMotionProgress(time, starts[index], frame.hold ?? 0, frame.seconds);
  if (!progress) return frame.items;
  const tracks = new Map(coachTracks(play, index).map(track => [track.id, track]));
  return frame.items.map(piece => {
    const track = tracks.get(piece.id);
    if (!track) return piece;
    const sample = sampleCoachTrack(track, progress);
    return { ...piece, x: sample.x, y: sample.y, angle: sample.angle };
  });
}
