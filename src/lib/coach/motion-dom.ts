import {
  coachMotionProgress, coachTracks, sampleCoachTrack,
  type CoachTrack,
} from './motion';
import { frameAt, frameTimes, type CoachPlay } from './model';

type Sampler = typeof sampleCoachTrack;

/** Shared by live SVG playback and the standalone HTML file. */
export function describeCoachTrack(track: CoachTrack, progress: number, sample: Sampler, effects = true) {
  const pose = sample(track, progress);
  const format = {
    number(value: number) { return Math.round(value * 100) / 100; },
  };
  const airborne = track.mode === 'pass' || track.mode === 'kick';
  const showTrail = effects && progress > .02 && progress < 1 && (airborne || track.mode === 'runner');
  const tailSpan = airborne ? .28 : .18;
  let trail = '';
  let tail = '';
  if (showTrail) {
    for (let index = 0; index <= 5; index++) {
      const past = sample(track, Math.max(0, progress - tailSpan * (1 - index / 5)));
      const point = format.number(past.x) + ' ' + format.number(past.y - past.altitude);
      trail += (index === 0 ? 'M' : 'L') + point;
      if (index >= 3) tail += (index === 3 ? 'M' : 'L') + point;
    }
  }
  const glow = showTrail ? Math.sin(Math.PI * progress) ** .7 : 0;
  return {
    transform: 'translate(' + format.number(pose.x) + ' ' + format.number(pose.y) + ')',
    gear: 'rotate(' + format.number(pose.angle) + ')',
    ball: 'translate(0 ' + format.number(-pose.altitude) + ') rotate(' + format.number(pose.rotation)
      + ') scale(' + format.number(1 + pose.altitude / 225) + ')',
    shadow: format.number(Math.max(.16, .48 - pose.altitude / 200)),
    shadowSize: format.number(1 + pose.altitude / 185),
    trail,
    tail,
    opacity: format.number(glow * (airborne ? .48 : .24)),
    tipOpacity: format.number(glow * (airborne ? .92 : .52)),
    landing: airborne ? format.number(glow * .42) : 0,
  };
}

interface TrackNodes {
  track: CoachTrack;
  token: Element;
  gear: Element | null;
  ball: Element | null;
  shadow: Element | null;
  trail: Element | undefined;
  tail: Element | undefined;
  landing: Element | undefined;
}

export function bindCoachTracks(svg: ParentNode, tracks: CoachTrack[]): TrackNodes[] {
  const [tokens, trails, tails, landings] = ['data-piece-id', 'data-motion-trail', 'data-motion-tip', 'data-motion-landing']
    .map(attribute => new Map(Array.from(svg.querySelectorAll('[' + attribute + ']'), element => [element.getAttribute(attribute), element])));

  return tracks.flatMap(track => {
    const token = tokens.get(track.id);
    return token ? [{
      track, token,
      gear: token.querySelector('[data-motion-gear]'),
      ball: token.querySelector('[data-motion-ball]'),
      shadow: token.querySelector('[data-motion-shadow]'),
      trail: trails.get(track.id),
      tail: tails.get(track.id),
      landing: landings.get(track.id),
    }] : [];
  });
}

/** No per-frame SVG parsing or re-creation of hit targets. */
export function paintCoachTracks(
  nodes: TrackNodes[], progress: number, sample: Sampler,
  describe: typeof describeCoachTrack, effects: boolean,
) {
  for (const { track, token, gear, ball, shadow, trail, tail, landing } of nodes) {
    const pose = describe(track, progress, sample, effects);
    token.setAttribute('transform', pose.transform);
    gear?.setAttribute('transform', pose.gear);
    ball?.setAttribute('transform', pose.ball);
    shadow?.setAttribute('opacity', String(pose.shadow));
    shadow?.setAttribute('transform', 'translate(1 4) scale(' + pose.shadowSize + ')');
    trail?.setAttribute('d', pose.trail);
    trail?.setAttribute('opacity', String(pose.opacity));
    tail?.setAttribute('d', pose.tail);
    tail?.setAttribute('opacity', String(pose.tipOpacity));
    landing?.setAttribute('opacity', String(pose.landing));
  }
}

const bindings = new WeakMap<SVGSVGElement, { play: CoachPlay; phase: number; start: number; nodes: TrackNodes[] }>();

export function paintCoachBoard(container: ParentNode, play: CoachPlay, time: number) {
  const svg = container.querySelector<SVGSVGElement>('svg[data-coach-pitch]');
  if (!svg) return;
  const phase = frameAt(play, time);
  const frame = play.frames[phase];
  if (!frame) return;
  let cached = bindings.get(svg);
  if (!cached || cached.play !== play || cached.phase !== phase) {
    cached = { play, phase, start: frameTimes(play)[phase], nodes: bindCoachTracks(svg, coachTracks(play, phase)) };
    bindings.set(svg, cached);
  }
  const progress = coachMotionProgress(time, cached.start, frame.hold ?? 0, frame.seconds);
  const effects = typeof matchMedia === 'undefined' || !matchMedia('(prefers-reduced-motion: reduce)').matches;
  paintCoachTracks(cached.nodes, progress, sampleCoachTrack, describeCoachTrack, effects);
}
