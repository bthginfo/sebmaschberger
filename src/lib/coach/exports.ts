import { frameTimes, playDuration, type CoachPlay } from './model';
import { coachMotionProgress, coachTracks, sampleCoachTrack } from './motion';
import { bindCoachTracks, describeCoachTrack, paintCoachTracks } from './motion-dom';
import { escapeCoachText, renderCoachBoard } from './scene';

const htmlStyles = `
  :root{color-scheme:light;font:16px/1.5 system-ui,sans-serif;background:#eef2ee;color:#182a25}
  *{box-sizing:border-box}body{margin:0}main{max-width:1110px;margin:auto;padding:44px 24px 60px}
  header{margin-bottom:26px}h1,h2,p{margin:0}h1{font-size:clamp(30px,6vw,56px);line-height:1.04;letter-spacing:-.035em}
  header p{color:#455c52;margin-top:12px;max-width:65ch}.stage{border-radius:18px;background:#102d25;color:#f1f9ef;padding:10px}
  #pitch{overflow:hidden;border-radius:11px}svg{display:block;width:100%;height:auto}
  .transport{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:12px 5px 3px}
  button,select{font:inherit;font-size:.9rem;color:inherit;background:#fff;border:1px solid #c7d3cc;border-radius:10px;min-height:44px;padding:0 12px;cursor:pointer}
  .transport button,.transport select{background:#22463a;border-color:#527063;color:#f1f9ef}
  button#play{background:#ceef9a;color:#152b22;border-color:#ceef9a;min-width:93px;font-weight:700}
  button:disabled{opacity:.55;cursor:default}button:focus-visible,select:focus-visible,input:focus-visible{outline:3px solid #4c95ff;outline-offset:3px}
  #loop[aria-pressed=true]{background:#dfeefc;color:#183b64}#position{flex:1;min-width:80px;accent-color:#ceef9a}
  output{font-size:.84rem;font-variant-numeric:tabular-nums;color:#d0e5d5;min-width:95px;text-align:right}
  .chapters{display:flex;gap:6px;overflow-x:auto;margin-top:16px;padding:3px 3px 5px}
  .chapters button{white-space:nowrap;flex:none}.chapters button[aria-pressed=true]{border-color:#31634e;background:#e2ede4;color:#123a2a;font-weight:650}
  .phase,details{margin-top:24px;padding-top:20px;border-top:1px solid #cad8cf}.phase h2{font-size:1.25rem}
  .phase p,dd{margin-top:6px;color:#455c52;max-width:65ch;white-space:pre-wrap}summary{cursor:pointer;font-weight:650}
  dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-bottom:0}dt{font-size:.82rem;color:#455c52}dd{margin-left:0}
  @media(max-width:650px){main{padding:24px 12px 40px}.stage{padding:6px}.transport{padding:8px 2px 2px;gap:5px}.transport button,.transport select{padding:0 9px}
  #position{order:2;min-width:calc(100% - 105px)}output{order:3}dl{grid-template-columns:1fr}}
`;

const htmlPlayer = `
  const data = JSON.parse(document.getElementById('data').textContent);
  const pitch = document.getElementById('pitch');
  const slider = document.getElementById('position');
  const play = document.getElementById('play');
  const speed = document.getElementById('speed');
  const previous = document.getElementById('previous');
  const next = document.getElementById('next');
  const loop = document.getElementById('loop');
  const title = document.getElementById('phase');
  const notes = document.getElementById('notes');
  const output = document.getElementById('time');
  const chapters = Array.from(document.querySelectorAll('[data-phase]'));
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const format = new Intl.NumberFormat(data.locale, {minimumFractionDigits:1, maximumFractionDigits:1});
  let index = -1, time = 0, running = false, repeat = false, last = 0, request = 0, moving = [];
  function paint() {
    let at = 0;
    for (let step = 1; step < data.times.length && data.times[step] <= time; step++) at = step;
    const frame = data.frames[at];
    if (at !== index) {
      index = at;
      pitch.innerHTML = frame.svg;
      title.textContent = frame.title;
      notes.textContent = frame.notes;
      moving = bind(pitch, frame.tracks);
      chapters.forEach((button, position) => button.setAttribute('aria-pressed', String(position === index)));
    }
    paintTracks(moving, progress(time, data.times[index], frame.hold, frame.seconds), sample, describe, !media.matches);
    slider.value = time;
    output.value = format.format(time) + ' / ' + format.format(data.duration) + ' s';
    previous.disabled = time === 0;
    next.disabled = index >= data.frames.length - 1;
  }
  function pause() {
    running = false;
    cancelAnimationFrame(request);
    play.textContent = data.labels.play;
    play.setAttribute('aria-pressed','false');
  }
  function tick(now) {
    if (!running) return;
    time += Math.min(now - last, 100) / 1000 * Number(speed.value);
    last = now;
    if (time >= data.duration) {
      if (repeat) time %= data.duration;
      else {
        time = data.duration;
        paint();
        pause();
        return;
      }
    }
    paint();
    request = requestAnimationFrame(tick);
  }
  function seek(value) {
    pause();
    time = value;
    paint();
  }
  play.addEventListener('click', () => {
    if (running) return pause();
    if (time >= data.duration) time = 0;
    last = performance.now();
    running = true;
    play.textContent = data.labels.pause;
    play.setAttribute('aria-pressed','true');
    request = requestAnimationFrame(tick);
  });
  previous.addEventListener('click', () => seek(data.times[time > data.times[index] + .05 ? index : Math.max(0,index-1)]));
  next.addEventListener('click', () => seek(data.times[Math.min(index + 1,data.times.length - 1)]));
  slider.addEventListener('input', () => seek(Number(slider.value)));
  loop.addEventListener('click', () => {
    repeat = !repeat;
    loop.setAttribute('aria-pressed', String(repeat));
  });
  chapters.forEach((button, at) => button.addEventListener('click', () => seek(data.times[at])));
  paint();
`;

function planEntries(play: CoachPlay): [string, string][] {
  const plan = play.plan;
  if (!plan) return [];
  const en = play.locale === 'en';
  const entries: [string, string | undefined][] = [
    [en ? 'Objective' : 'Lernziel', plan.objective],
    [en ? 'Players' : 'Spielerzahl', plan.players],
    [en ? 'Space' : 'Feldgröße', plan.area],
    [en ? 'Equipment' : 'Material', plan.equipment],
    [en ? 'Duration' : 'Trainingsdauer', plan.minutes ? String(plan.minutes) + ' min' : undefined],
    [en ? 'Progression' : 'Steigerung', plan.progression],
  ];
  return entries.flatMap(([label, value]) => value?.trim() ? [[label, value.trim()]] : []);
}

export function makeCoachHtml(play: CoachPlay): string {
  const english = play.locale === 'en';
  const copy = english
    ? { play: 'Play', pause: 'Pause', previous: 'Previous phase', next: 'Next phase', speed: 'Playback speed', position: 'Playback position', fallback: 'Phase', loop: 'Loop', plan: 'Session plan', chapters: 'Phases' }
    : { play: 'Abspielen', pause: 'Pause', previous: 'Vorige Phase', next: 'Nächste Phase', speed: 'Wiedergabetempo', position: 'Wiedergabeposition', fallback: 'Phase', loop: 'Schleife', plan: 'Trainingsplan', chapters: 'Phasen' };
  const duration = playDuration(play);
  const frames = play.frames.map((frame, frameIndex) => ({
    title: frame.title || copy.fallback + ' ' + (frameIndex + 1),
    notes: frame.notes,
    seconds: frame.seconds,
    hold: frame.hold ?? 0,
    svg: renderCoachBoard(play, 0, { frameIndex, variant: 'play' }),
    tracks: coachTracks(play, frameIndex),
  }));
  const data = JSON.stringify({
    locale: play.locale, labels: { play: copy.play, pause: copy.pause },
    duration, times: frameTimes(play), frames,
  }).replaceAll('<', '\\u003c');
  const disabled = duration === 0 ? ' disabled' : '';
  const plan = planEntries(play);
  const runtime = `
const sample = (${sampleCoachTrack.toString()});
const progress = (${coachMotionProgress.toString()});
const describe = (${describeCoachTrack.toString()});
const bind = (${bindCoachTracks.toString()});
const paintTracks = (${paintCoachTracks.toString()});
${htmlPlayer}`;

  return `<!doctype html>
<html lang="${play.locale}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'">
<title>${escapeCoachText(play.title)}</title><style>${htmlStyles}</style>
<main><header><h1>${escapeCoachText(play.title)}</h1>${play.description ? `<p>${escapeCoachText(play.description)}</p>` : ''}</header>
<div class="stage"><div id="pitch">${frames[0]?.svg ?? ''}</div>
<div class="transport">
  <button id="previous" aria-label="${copy.previous}" title="${copy.previous}">←</button>
  <button id="play" aria-pressed="false"${disabled}>${copy.play}</button>
  <button id="next" aria-label="${copy.next}" title="${copy.next}">→</button>
  <input type="range" id="position" min="0" max="${duration || 1}" step=".01" value="0" aria-label="${copy.position}"${disabled}>
  <output id="time" for="position" aria-live="off"></output>
  <select id="speed" aria-label="${copy.speed}"${disabled}><option value=".25">0.25×</option><option value=".5">0.5×</option><option value=".75">0.75×</option><option selected value="1">1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select>
  <button id="loop" aria-pressed="false"${disabled}>${copy.loop}</button>
</div></div>
<nav class="chapters" aria-label="${copy.chapters}">${frames.map((frame, index) => `<button type="button" data-phase="${index}" aria-pressed="${index === 0}">${escapeCoachText(frame.title)}</button>`).join('')}</nav>
<section class="phase"><h2 id="phase">${escapeCoachText(frames[0]?.title ?? '')}</h2><p id="notes">${escapeCoachText(frames[0]?.notes ?? '')}</p></section>
${plan.length ? `<details><summary>${copy.plan}</summary><dl>${plan.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeCoachText(value)}</dd></div>`).join('')}</dl></details>` : ''}
</main><script id="data" type="application/json">${data}</script><script>${runtime}</script></html>`;
}

function download(blob: Blob, title: string, extension: 'html' | 'pdf') {
  const name = title.normalize('NFKD').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${name || 'rugby-taktik'}.${extension}`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function downloadCoachHtml(play: CoachPlay) {
  download(new Blob([makeCoachHtml(play)], { type: 'text/html;charset=utf-8' }), play.title, 'html');
}

async function rasterizeBoard(play: CoachPlay, frameIndex: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 992;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Das Spielfeld konnte nicht gezeichnet werden.');
  const svg = renderCoachBoard(play, 0, { frameIndex }).replace('<svg ', '<svg width="1000" height="620" ');
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Das Spielfeld konnte nicht exportiert werden.');
    return blob.arrayBuffer();
  } finally {
    URL.revokeObjectURL(url);
  }
}

type PdfFont = import('pdf-lib').PDFFont;

function pdfLines(value: string, font: PdfFont, size: number, width: number): string[] {
  const supported = new Set(font.getCharacterSet());
  const clean = Array.from(value.normalize('NFC').replace(/\s+/gu, ' ').trim(), char =>
    supported.has(char.codePointAt(0)!) ? char : '?',
  ).join('');
  const lines: string[] = [];
  let line = '';
  for (const word of clean.split(' ')) {
    const joined = line ? line + ' ' + word : word;
    if (font.widthOfTextAtSize(joined, size) <= width) {
      line = joined;
      continue;
    }
    if (line) lines.push(line);
    line = '';
    for (const char of word) {
      if (font.widthOfTextAtSize(line + char, size) > width) {
        lines.push(line);
        line = '';
      }
      line += char;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fitPdfText(value: string, font: PdfFont, width: number, height: number, maxSize: number) {
  let size = maxSize;
  let lines = pdfLines(value, font, size, width);
  while (lines.length * (size + 3) > height && size > 6) {
    size -= .5;
    lines = pdfLines(value, font, size, width);
  }
  return { size, lines, leading: size + 3 };
}

export async function downloadCoachPdf(play: CoachPlay) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const english = play.locale === 'en';
  const ink = rgb(.08, .18, .14);
  const quiet = rgb(.25, .37, .32);
  const frameStarts = frameTimes(play);
  const format = new Intl.NumberFormat(play.locale, { maximumFractionDigits: 1 });
  document.setTitle(play.title);
  document.setSubject(play.description);
  document.setCreator('Coach Studio');

  const plan = planEntries(play);
  if (plan.length) {
    const page = document.addPage([842, 595]);
    page.drawText(english ? 'Session plan' : 'Trainingsplan', { x: 36, y: 552, size: 12, font: bold, color: quiet });
    const heading = fitPdfText(play.title, bold, 770, 63, 28);
    heading.lines.forEach((line, row) => page.drawText(line, {
      x: 36, y: 523 - row * heading.leading, size: heading.size, font: bold, color: ink,
    }));
    const summary = fitPdfText(play.description, regular, 770, 42, 11);
    summary.lines.forEach((line, row) => page.drawText(line, {
      x: 36, y: 451 - row * summary.leading, size: summary.size, font: regular, color: quiet,
    }));
    let size = 11;
    let rows = plan.map(([label, value]) => ({ label, lines: pdfLines(value, regular, size, 608) }));
    while (rows.reduce((total, row) => total + row.lines.length * (size + 3) + 14, 0) > 340 && size > 7) {
      size -= .5;
      rows = plan.map(([label, value]) => ({ label, lines: pdfLines(value, regular, size, 608) }));
    }
    let top = 386;
    for (const { label, lines } of rows) {
      page.drawLine({ start: { x: 36, y: top + 11 }, end: { x: 806, y: top + 11 }, color: rgb(.82, .88, .84), thickness: 1 });
      page.drawText(label, { x: 36, y: top - 4, size: 10.5, font: bold, color: ink });
      lines.forEach((line, row) => page.drawText(line, {
        x: 188, y: top - 4 - row * (size + 3), size, font: regular, color: quiet,
      }));
      top -= lines.length * (size + 3) + 14;
    }
  }

  for (const [index, frame] of play.frames.entries()) {
    const page = document.addPage([842, 595]);
    const board = await document.embedPng(await rasterizeBoard(play, index));
    const title = fitPdfText(play.title, bold, 770, 64, 29);
    title.lines.forEach((line, row) => page.drawText(line, { x: 36, y: 541 - row * title.leading, size: title.size, font: bold, color: ink }));
    const hold = frame.hold ? `   ·   ${format.format(frame.hold)} s ${english ? 'hold' : 'Standzeit'}` : '';
    page.drawText(`Phase ${index + 1} / ${play.frames.length}   ·   ${format.format(frameStarts[index])} s${hold}`, { x: 36, y: 470, size: 11, font: regular, color: quiet });
    page.drawImage(board, { x: 36, y: 110, width: 542, height: 336.04 });
    const phaseTitle = fitPdfText(frame.title || (english ? 'Set-up' : 'Aufstellung'), bold, 207, 96, 17);
    phaseTitle.lines.forEach((line, row) => page.drawText(line, { x: 600, y: 429 - row * phaseTitle.leading, size: phaseTitle.size, font: bold, color: ink }));
    const notesStart = 418 - phaseTitle.lines.length * phaseTitle.leading;
    const notes = fitPdfText(frame.notes || play.description, regular, 207, notesStart - 91, 10.5);
    notes.lines.forEach((line, row) => page.drawText(line, { x: 600, y: notesStart - row * notes.leading, size: notes.size, font: regular, color: quiet }));
    page.drawLine({ start: { x: 36, y: 76 }, end: { x: 806, y: 76 }, color: rgb(.78, .85, .81), thickness: 1 });
    page.drawText(english ? 'Circle: attack  ·  Square: defence  ·  Solid: run  ·  Dashed: pass  ·  Dotted: kick'
      : 'Kreis: Angriff  ·  Quadrat: Verteidigung  ·  Durchgezogen: Lauf  ·  Gestrichelt: Pass  ·  Gepunktet: Kick',
    { x: 36, y: 49, size: 10, font: regular, color: quiet });
  }

  const bytes = await document.save();
  download(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }), play.title, 'pdf');
}
