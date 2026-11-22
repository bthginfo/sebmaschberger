import {
  PITCH_HEIGHT, PITCH_WIDTH, frameAt, frameTimes,
  type CoachKind, type CoachLocale, type CoachPiece, type CoachPitch, type CoachPlay, type CoachTone,
} from './model';
import { coachMotionProgress, coachTracks, sampleCoachPieces, sampleCoachTrack, type CoachTrack } from './motion';
import { describeCoachTrack } from './motion-dom';

interface BoardOptions {
  frameIndex?: number;
  selectedId?: string | null;
  routes?: boolean;
  variant?: 'edit' | 'play';
  locale?: CoachLocale;
  sceneKey?: string;
}

const routeKinds: ReadonlySet<CoachKind> = new Set(['run', 'pass', 'kick']);
const tones: Record<CoachTone, { bright: string; ink: string }> = {
  sky: { bright: '#92baff', ink: '#2b54a0' },
  coral: { bright: '#ffaf92', ink: '#9a402e' },
  mint: { bright: '#c7ef92', ink: '#476a23' },
  amber: { bright: '#ffce80', ink: '#905014' },
  violet: { bright: '#c4b1ff', ink: '#6747a0' },
  white: { bright: '#eef5ee', ink: '#3d4b56' },
};
const pitchInk = '#e1f2e1';

export function escapeCoachText(value: string): string {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/gu, '\ufffd')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function n(value: number): number {
  return Math.round(value * 100) / 100;
}

function gradientKey(value: string) {
  let hash = 0;
  for (const letter of value) hash = (hash * 31 + letter.charCodeAt(0)) | 0;
  return 'coach-light-' + (hash >>> 0).toString(36);
}

function pitchBackground(pitch: CoachPitch, locale: CoachLocale, key: string, playing: boolean): string {
  if (pitch === 'whiteboard') {
    const dots = Array.from({ length: 25 }, (_, x) =>
      Array.from({ length: 16 }, (_, y) => `M${20 + x * 40} ${10 + y * 40}h.1`).join(''),
    ).join('');
    return `<rect width="1000" height="620" fill="#f5f7f4"/>
      <rect x="20" y="20" width="960" height="580" rx="24" fill="#fbfdfb" stroke="#dbe4dc"/>
      <path d="${dots}" fill="none" stroke="#d2ded4" stroke-width="2" stroke-linecap="round"/>`;
  }

  const left = pitch === 'full' ? -10 : pitch === 'half' ? 50 : 78;
  const mapX = (metres: number) => n(36 + (metres - left) * 928 / (110 - left));
  const mapY = (metres: number) => n(38 + metres * 544 / 70);
  const fieldTop = mapY(0);
  const fieldBottom = mapY(70);
  const solid = [0, 22, 50, 78, 100].filter(line => line >= left);
  const dashed = [5, 40, 60, 95].filter(line => line >= left);
  const stripes = Array.from({ length: 12 }, (_, index) => -10 + index * 10)
    .filter(start => start + 10 > left)
    .map(start => `<rect x="${mapX(Math.max(start, left))}" y="${fieldTop}" width="${n(mapX(start + 10) - mapX(Math.max(start, left)))}" height="544" fill="${start % 20 ? '#214c3f' : '#285547'}"/>`).join('');
  const markings = solid.map(line => `M${mapX(line)} ${fieldTop}V${fieldBottom}`).join('');
  const dashMarkings = [
    ...dashed.map(line => `M${mapX(line)} ${fieldTop}V${fieldBottom}`),
    ...[5, 15, 55, 65].map(line => `M${mapX(Math.max(left, 0))} ${mapY(line)}H${mapX(100)}`),
  ].join('');
  const goals = [0, 100].filter(line => line >= left)
    .map(line => `M${mapX(line) - 10} ${mapY(32.2)}h20 M${mapX(line) - 10} ${mapY(37.8)}h20`).join('');
  const labels: [number, string][] = [[22, '22'], [40, '10'], [50, '50'], [60, '10'], [78, '22'], [100, locale === 'de' ? 'MAL' : 'TRY']];
  const tags = labels.filter(([line]) => line >= left).map(([line, label]) =>
    `<text x="${mapX(line) === 36 ? 46 : mapX(line)}" y="606" text-anchor="middle">${label}</text>`,
  ).join('');
  const perimeter = `M36 ${fieldTop}H964V${fieldBottom}H36Z`;

  return `<defs><radialGradient id="${key}" cx=".47" cy=".37" r=".7">
      <stop offset="0" stop-color="#add9b2" stop-opacity="${playing ? '.16' : '.09'}"/>
      <stop offset=".62" stop-color="#427259" stop-opacity=".04"/>
      <stop offset="1" stop-color="#071e1a" stop-opacity="${playing ? '.38' : '.21'}"/>
    </radialGradient></defs>
    <rect width="1000" height="620" fill="#102d25"/>
    <rect x="24" y="26" width="952" height="568" rx="12" fill="#0b241e"/>
    ${stripes}
    <rect x="36" y="38" width="928" height="544" fill="url(#${key})"/>
    <path d="${perimeter}" fill="none" stroke="#061d18" stroke-width="5"/>
    <path d="${perimeter}${markings}" fill="none" stroke="${pitchInk}" stroke-opacity=".65" stroke-width="1.6"/>
    <path d="${dashMarkings}" fill="none" stroke="${pitchInk}" stroke-opacity=".36" stroke-width="1.35" stroke-dasharray="14 12"/>
    <path d="${goals}" stroke="${pitchInk}" stroke-opacity=".9" stroke-width="4" stroke-linecap="round"/>
    ${left <= 50 ? `<path d="M${mapX(50) - 4} ${mapY(35)}h8" stroke="${pitchInk}" stroke-width="2"/>` : ''}
    <g fill="#c9e2d0" font-size="13" font-weight="700" letter-spacing="1.3">${tags}</g>`;
}

function defaultTone(kind: CoachKind): CoachTone {
  if (kind === 'attack' || kind === 'run') return 'sky';
  if (kind === 'defence' || kind === 'pad') return 'coral';
  if (kind === 'pass' || kind === 'zone' || kind === 'ring') return 'mint';
  if (kind === 'kick' || kind === 'cone' || kind === 'gate' || kind === 'ball') return 'amber';
  return kind === 'flag' ? 'violet' : 'white';
}

function pieceColor(piece: CoachPiece, light: boolean) {
  return tones[piece.tone ?? defaultTone(piece.kind)][light ? 'ink' : 'bright'];
}

function drawRoute(piece: CoachPiece, light: boolean, selected: boolean, playing: boolean): string {
  const dx = (piece.x2 ?? (piece.x > 850 ? piece.x - 100 : piece.x + 100)) - piece.x;
  const dy = (piece.y2 ?? piece.y) - piece.y;
  const length = Math.hypot(dx, dy) || 1;
  const curve = piece.curve ?? 0;
  const controlX = dx / 2 - dy / length * curve;
  const controlY = dy / 2 + dx / length * curve;
  const tangent = Math.atan2(dy - controlY, dx - controlX);
  const left = [n(dx - 16 * Math.cos(tangent - .48)), n(dy - 16 * Math.sin(tangent - .48))];
  const right = [n(dx - 16 * Math.cos(tangent + .48)), n(dy - 16 * Math.sin(tangent + .48))];
  const color = pieceColor(piece, light);
  const dash = piece.kind === 'pass' ? ' stroke-dasharray="11 8"'
    : piece.kind === 'kick' ? ' stroke-dasharray="3 9"'
    : piece.kind === 'line' ? ' stroke-dasharray="16 7"' : '';
  const path = `M0 0 Q${n(controlX)} ${n(controlY)} ${n(dx)} ${n(dy)}`;
  const handles = selected ? `<circle data-handle="start" r="10" fill="#fff" stroke="#2267d1" stroke-width="3"/><circle data-handle="end" cx="${n(dx)}" cy="${n(dy)}" r="10" fill="#fff" stroke="#2267d1" stroke-width="3"/>` : '';
  const label = piece.label ? `<text x="${n((2 * controlX + dx) / 4)}" y="${n((2 * controlY + dy) / 4 - 13)}" text-anchor="middle" fill="${color}" paint-order="stroke" stroke="${light ? '#fbfdfb' : '#18392f'}" stroke-width="5" font-size="15" font-weight="700">${escapeCoachText(piece.label)}</text>` : '';
  const arrow = piece.kind !== 'line'
    ? `<path d="M${left[0]} ${left[1]} L${n(dx)} ${n(dy)} L${right[0]} ${right[1]}" fill="none" stroke="${color}" stroke-width="3.3" stroke-linecap="round" stroke-linejoin="round"/>` : '';
  const opacity = playing && piece.kind !== 'line' ? '.64' : '1';
  return `<path d="${path}" fill="none" stroke="transparent" stroke-width="25" pointer-events="stroke"/>
    <g opacity="${opacity}"><path d="${path}" fill="none" stroke="${color}" stroke-width="${selected ? 4.8 : 3.3}" stroke-linecap="round"${dash}/>${arrow}</g>${label}${handles}`;
}

type Visual = ReturnType<typeof describeCoachTrack>;

function drawPiece(piece: CoachPiece, light: boolean, selected: boolean, playing: boolean, pose?: Visual): string {
  if (routeKinds.has(piece.kind) || piece.kind === 'line') return drawRoute(piece, light, selected, playing);
  const label = escapeCoachText(piece.label);
  const color = pieceColor(piece, light);
  const token = tones[piece.tone ?? defaultTone(piece.kind)].bright;
  const stroke = '#102822';
  const ring = selected ? '<circle r="28" fill="none" stroke="#fff" stroke-width="3.6"/><circle r="28" fill="none" stroke="#2267d1" stroke-width="2" stroke-dasharray="5 4"/>' : '';
  const caption = label ? `<text x="27" y="5" fill="${light ? '#203a30' : '#f1f9ef'}" stroke="${light ? '#fbfdfb' : '#18372d'}" stroke-width="5" paint-order="stroke" font-size="15" font-weight="700">${label}</text>` : '';

  if (piece.kind === 'attack' || piece.kind === 'defence') {
    const circle = piece.kind === 'attack';
    const shape = circle
      ? `<circle r="20" fill="${token}" stroke="${stroke}" stroke-width="2.5"/><circle r="16" fill="none" stroke="#fff" stroke-opacity=".31"/>`
      : `<rect x="-19" y="-19" width="38" height="38" rx="9" fill="${token}" stroke="${stroke}" stroke-width="2.5"/><rect x="-15.5" y="-15.5" width="31" height="31" rx="6.5" fill="none" stroke="#fff" stroke-opacity=".32"/>`;
    return `<circle r="27" fill="transparent"/><ellipse cx="1" cy="18" rx="18" ry="6.5" fill="#081d18" opacity=".34"/>
      ${shape}<text y=".8" text-anchor="middle" dominant-baseline="central" fill="#132b3a" font-weight="820" font-size="${piece.label.length > 3 ? 11.5 : 18.5}">${escapeCoachText(piece.label.slice(0, 6))}</text>${ring}`;
  }
  if (piece.kind === 'ball') {
    const fill = piece.tone ? token : '#fff2c9';
    return `<circle r="19" fill="transparent"/><ellipse data-motion-shadow="" rx="12.5" ry="4.3" fill="#081b17" opacity="${pose?.shadow ?? .48}" transform="translate(1 4) scale(${pose?.shadowSize ?? 1})"/>
      <g data-motion-ball="" transform="${pose?.ball ?? 'rotate(-32)'}"><ellipse rx="13" ry="8" fill="${fill}" stroke="#674a2c" stroke-width="1.7"/>
        <path d="M-7 -2Q0 -4 7 -2" stroke="#fffefa" stroke-opacity=".68" fill="none" stroke-width="1.4"/><path d="M-5 1H5 M-2 -1v4 M2 -1v4" stroke="#72542f" stroke-width="1.35"/></g>${ring}`;
  }
  if (piece.kind === 'cone') {
    return `<circle r="18" fill="transparent"/><path d="M0 -10L10 8H-10Z" fill="${token}" stroke="#603b24" stroke-width="1.6"/><path d="M-6 5H6" stroke="#fff" stroke-opacity=".55" stroke-width="1.5"/>${ring}`;
  }
  if (piece.kind === 'zone' || piece.kind === 'ring') {
    const width = n(piece.width ?? 150);
    const height = n(piece.height ?? 90);
    const geometry = piece.kind === 'ring'
      ? `<ellipse cx="${width / 2}" cy="${height / 2}" rx="${width / 2}" ry="${height / 2}"`
      : `<rect width="${width}" height="${height}" rx="12"`;
    return `${geometry} fill="${color}" fill-opacity="${light ? '.11' : '.17'}" stroke="${selected ? '#5690ff' : color}" stroke-width="${selected ? 3 : 1.8}" stroke-dasharray="7 6"/>
      ${label ? `<text x="${width / 2}" y="${Math.min(height / 2 + 5, 24)}" text-anchor="middle" fill="${light ? '#233a29' : '#f1fae6'}" font-size="14" font-weight="700">${label}</text>` : ''}`;
  }
  if (piece.kind === 'gate' || piece.kind === 'pad' || piece.kind === 'flag') {
    const equipment = piece.kind === 'gate'
      ? `<path d="M-18 0H18" stroke="${color}" stroke-width="2" stroke-dasharray="4 4"/><path d="M-21 -11l9 20h-18ZM21 -11l9 20H12Z" fill="${token}" stroke="${stroke}" stroke-width="1.6"/>`
      : piece.kind === 'pad'
        ? `<rect x="-23" y="-12" width="46" height="24" rx="10" fill="${token}" stroke="${stroke}" stroke-width="2"/><path d="M-10 -10V10M10 -10V10" stroke="${stroke}" stroke-opacity=".45" stroke-width="2"/>`
        : `<ellipse cy="12" rx="10" ry="4" fill="${stroke}" opacity=".5"/><path d="M-7 12V-19M-6 -18H16L11 -12l5 6H-6" fill="${token}" stroke="${stroke}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`;
    return `<circle r="27" fill="transparent"/><g data-motion-gear="" transform="${pose?.gear ?? `rotate(${n(piece.angle ?? 0)})`}">${equipment}</g>${caption}${ring}`;
  }
  if (piece.kind === 'ruck' || piece.kind === 'scrum' || piece.kind === 'lineout') {
    const symbol = { ruck: 'R', scrum: 'S', lineout: 'L' }[piece.kind];
    return `<circle r="23" fill="transparent"/><rect x="-18" y="-18" width="36" height="36" rx="12" fill="${light ? '#31564b' : '#112c26'}" stroke="${piece.tone ? token : '#b9e0c3'}" stroke-width="2"/>
      <text text-anchor="middle" dominant-baseline="central" fill="#f1f9ea" font-size="19" font-weight="800">${symbol}</text>${ring}${caption}`;
  }

  return `<rect x="-6" y="-19" width="${Math.max(30, piece.label.length * 8.5 + 14)}" height="27" rx="7" fill="${selected ? '#2267d1' : light ? '#e2ece5' : '#102e26'}"/>
    <text fill="${selected ? '#fff' : color}" font-size="16" font-weight="700">${label || '…'}</text>`;
}

function motionLayer(tracks: CoachTrack[], visuals: Map<string, Visual>, pieces: CoachPiece[], light: boolean) {
  const colors = new Map(pieces.map(piece => [piece.id, pieceColor(piece, light)]));
  const marks = tracks.map(track => {
    const pose = visuals.get(track.id)!;
    const flight = track.mode === 'kick' || track.mode === 'pass';
    if (track.mode !== 'runner' && !flight) return '';
    const id = escapeCoachText(track.id);
    const color = colors.get(track.id);
    return `<path data-motion-trail="${id}" d="${pose.trail}" opacity="${pose.opacity}" fill="none" stroke="${color}" stroke-width="${flight ? 9 : 7}" stroke-linecap="round"/>
      <path data-motion-tip="${id}" d="${pose.tail}" opacity="${pose.tipOpacity}" fill="none" stroke="${color}" stroke-width="${flight ? 4 : 3}" stroke-linecap="round"/>
      ${flight ? `<ellipse data-motion-landing="${id}" cx="${n(track.toX)}" cy="${n(track.toY)}" rx="18" ry="12" fill="none" stroke="${color}" stroke-width="1.8" stroke-dasharray="3 5" opacity="${pose.landing}"/>` : ''}`;
  }).join('');
  return `<g pointer-events="none" aria-hidden="true">${marks}</g>`;
}

export function renderCoachBoard(play: CoachPlay, time = 0, options: BoardOptions = {}): string {
  const index = options.frameIndex ?? frameAt(play, time);
  const frame = play.frames[index];
  const playing = options.variant === 'play';
  const tracks = playing ? coachTracks(play, index) : [];
  const progress = playing && frame && options.frameIndex === undefined
    ? coachMotionProgress(time, frameTimes(play)[index], frame.hold ?? 0, frame.seconds) : 0;
  const visuals = new Map(tracks.map(track => [track.id, describeCoachTrack(track, progress, sampleCoachTrack)]));
  const pieces = playing || options.frameIndex !== undefined ? frame?.items ?? [] : sampleCoachPieces(play, time);
  const light = play.pitch === 'whiteboard';
  const locale = options.locale ?? play.locale;
  const zones = pieces.filter(piece => piece.kind === 'zone' || piece.kind === 'ring');
  const routes = pieces.filter(piece => piece.kind === 'line'
    || (routeKinds.has(piece.kind) && (options.routes !== false || piece.id === options.selectedId)));
  const markers = pieces.filter(piece => !zones.includes(piece) && !routeKinds.has(piece.kind) && piece.kind !== 'line');
  const draw = (items: CoachPiece[]) => items.map(piece => {
    const pose = visuals.get(piece.id);
    return `<g data-piece-id="${escapeCoachText(piece.id)}" data-kind="${piece.kind}" transform="${pose?.transform ?? `translate(${n(piece.x)} ${n(piece.y)})`}">${drawPiece(piece, light, piece.id === options.selectedId, playing, pose)}</g>`;
  }).join('');
  const key = gradientKey(options.sceneKey ?? `${play.title}:${index}:${play.pitch}:${options.variant ?? 'edit'}`);
  const label = locale === 'en' ? 'Rugby tactics board' : 'Rugby-Taktiktafel';
  return `<svg data-coach-pitch="" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PITCH_WIDTH} ${PITCH_HEIGHT}" role="img" aria-label="${label}" font-family="system-ui, sans-serif">${pitchBackground(play.pitch, locale, key, playing)}
    ${draw(zones)}${draw(routes)}${options.routes !== false && playing ? motionLayer(tracks, visuals, pieces, light) : ''}
    ${draw(markers.filter(piece => piece.kind !== 'ball'))}${draw(markers.filter(piece => piece.kind === 'ball'))}</svg>`;
}
