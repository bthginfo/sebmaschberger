export type FrameSequence = {
 base: string;
 frames: number;
 fps: number;
 chunk: number;
 start: number;
 mobileQuery: string;
 alpha?: boolean;
 once?: boolean;
};

export type FrameTake = Omit<FrameSequence, 'mobileQuery'> & {
 cuts: number[];
 wide: { width: number; height: number };
 mobile: { width: number; height: number };
};

type DecodedFrame = {
 image: ImageBitmap | HTMLImageElement;
 close?: () => void;
};

type Rendition = {
 name: 'wide' | 'mobile';
 controller: AbortController;
 chunks: Map<number, Promise<Blob[]>>;
 buffered: Set<number>;
 decoded: Map<number, DecodedFrame>;
 decoding: Set<number>;
 next: number;
 ready: boolean;
 failed: boolean;
 ended: boolean;
};

export function readFrameChunk(buffer: ArrayBuffer, expected: number): Blob[] {
 // KFR1 contains a frame count, a table of byte lengths, then the WebP payloads.
 const view = new DataView(buffer);
 const tableEnd = 8 + expected * 4;
 if (buffer.byteLength < tableEnd || view.getUint32(0) !== 0x4b465231 || view.getUint32(4, true) !== expected) {
  throw new Error('Invalid frame bundle header');
 }

 let offset = tableEnd;
 const frames: Blob[] = [];
 for (let index = 0; index < expected; index++) {
  const length = view.getUint32(8 + index * 4, true);
  if (length === 0 || offset + length > buffer.byteLength) throw new Error('Invalid frame bundle length');
  frames.push(new Blob([new Uint8Array(buffer, offset, length)], { type: 'image/webp' }));
  offset += length;
 }
 if (offset !== buffer.byteLength) throw new Error('Unexpected data in frame bundle');
 return frames;
}

async function decodeFrame(blob: Blob): Promise<DecodedFrame> {
 if (typeof createImageBitmap === 'function') {
  try {
   const image = await createImageBitmap(blob);
   return { image, close: () => image.close() };
  } catch {
   // The document's image decoder can still support the format on some browsers.
  }
 }
 const url = URL.createObjectURL(blob);
 try {
  const image = new Image();
  image.src = url;
  await image.decode();
  return { image };
 } finally {
  URL.revokeObjectURL(url);
 }
}

async function fetchChunk(sequence: FrameSequence, name: Rendition['name'], number: number, signal: AbortSignal) {
 const suffix = String(number).padStart(2, '0');
 const expected = Math.min(sequence.chunk, sequence.frames - number * sequence.chunk);
 const response = await fetch(sequence.base + '/' + name + '-' + suffix + '.bin', { signal, cache: 'force-cache' });
 if (!response.ok) throw new Error('Frame bundle unavailable');
 return readFrameChunk(await response.arrayBuffer(), expected);
}

function paintFrame(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, frame: DecodedFrame, alpha?: boolean) {
 if (canvas.width !== frame.image.width) canvas.width = frame.image.width;
 if (canvas.height !== frame.image.height) canvas.height = frame.image.height;
 if (alpha) context.clearRect(0, 0, canvas.width, canvas.height);
 context.drawImage(frame.image, 0, 0);
}

export function mountFrameLoop(
 host: HTMLElement,
 canvas: HTMLCanvasElement,
 sequence: FrameSequence,
 onReady: (ready: boolean) => void,
 onPlaying: (playing: boolean) => void,
 onFrame: (index: number, rendition: Rendition['name']) => void,
) {
 const context = canvas.getContext('2d', { alpha: sequence.alpha ?? false });
 if (!context) return;

 const mobile = matchMedia(sequence.mobileQuery);
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const frameTime = 1000 / sequence.fps;
 const chunks = Math.ceil(sequence.frames / sequence.chunk);
 const lookahead = Math.min(3, chunks);
 let visible = false;
 let paused = false;
 let playing = false;
 let animation = 0;
 let nextAt = 0;
 let current: Rendition | undefined;

 function stop() {
  cancelAnimationFrame(animation);
  animation = 0;
  nextAt = 0;
  if (playing) {
   playing = false;
   onPlaying(false);
  }
 }

 function clearFrames(rendition: Rendition) {
  rendition.controller.abort();
  rendition.chunks.clear();
  rendition.buffered.clear();
  for (const frame of rendition.decoded.values()) frame.close?.();
  rendition.decoded.clear();
 }

 function fail(rendition: Rendition) {
  if (rendition.controller.signal.aborted) return;
  rendition.failed = true;
  rendition.ready = false;
  clearFrames(rendition);
  stop();
  onReady(false);
 }

 function loadChunk(rendition: Rendition, number: number) {
  let chunk = rendition.chunks.get(number);
  if (!chunk) {
   chunk = fetchChunk(sequence, rendition.name, number, rendition.controller.signal).then((frames) => {
    if (!rendition.controller.signal.aborted) rendition.buffered.add(number);
    return frames;
   });
   rendition.chunks.set(number, chunk);
   void chunk.catch(() => fail(rendition));
  }
  return chunk;
 }

 function queueFrames(rendition: Rendition) {
  // Buffer the current bundle and the next half-second intervals before playing.
  const currentChunk = Math.floor(rendition.next / sequence.chunk);
  for (let offset = 0; offset < lookahead; offset++) {
   if (sequence.once && currentChunk + offset >= chunks) break;
   loadChunk(rendition, (currentChunk + offset) % chunks);
  }
  for (let distance = 0; distance < 6 && rendition.decoding.size < 3; distance++) {
   if (sequence.once && rendition.next + distance >= sequence.frames) break;
   const index = (rendition.next + distance) % sequence.frames;
   if (rendition.decoded.has(index) || rendition.decoding.has(index)) continue;
   rendition.decoding.add(index);
   void loadChunk(rendition, Math.floor(index / sequence.chunk))
    .then((frames) => decodeFrame(frames[index % sequence.chunk]))
    .then((frame) => {
     if (rendition.controller.signal.aborted) frame.close?.();
     else rendition.decoded.set(index, frame);
    })
    .catch(() => fail(rendition))
    .finally(() => rendition.decoding.delete(index));
  }
 }

 function tick(time: number) {
  const rendition = current;
  if (!rendition || rendition.failed || !context) return;
  queueFrames(rendition);
  const frame = rendition.decoded.get(rendition.next);
  const buffered = rendition.ready || (
   rendition.decoded.size >= Math.min(3, sequence.once ? sequence.frames - rendition.next : sequence.frames) &&
   rendition.buffered.size >= (sequence.once ? Math.min(lookahead, chunks - Math.floor(rendition.next / sequence.chunk)) : lookahead)
  );
  if (frame && buffered && time >= nextAt) {
   paintFrame(canvas, context, frame, sequence.alpha);
   onFrame(rendition.next, rendition.name);
   rendition.decoded.delete(rendition.next);
   frame.close?.();
   if (!rendition.ready) {
    rendition.ready = true;
    onReady(true);
   }
   if (sequence.once && rendition.next === sequence.frames - 1) {
    rendition.ended = true;
    clearFrames(rendition);
    stop();
    return;
   }
   rendition.next = (rendition.next + 1) % sequence.frames;
   nextAt = !nextAt || time - nextAt >= frameTime ? time + frameTime : nextAt + frameTime;
   if (!playing) {
    playing = true;
    onPlaying(true);
   }
  }
  animation = requestAnimationFrame(tick);
 }

 function sync() {
  if (!visible || paused || current?.ended || reduced.matches || document.hidden) {
   stop();
   return;
  }
  current ??= {
   name: mobile.matches ? 'mobile' : 'wide',
   controller: new AbortController(),
   chunks: new Map(),
   buffered: new Set(),
   decoded: new Map(),
   decoding: new Set(),
   next: sequence.start,
   ready: false,
   failed: false,
   ended: false,
  };
  if (!animation && !current.failed) animation = requestAnimationFrame(tick);
 }

 function reset() {
  stop();
  paused = false;
  if (current) clearFrames(current);
  current = undefined;
  onReady(false);
  sync();
 }

 const observer = new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting && entry.intersectionRatio >= .08;
  sync();
 }, { threshold: .08 });
 observer.observe(host);
 mobile.addEventListener('change', reset);
 reduced.addEventListener('change', reset);
 document.addEventListener('visibilitychange', sync);

 return {
  pause(value: boolean) {
   paused = value;
   if (!value && current?.ended) current = undefined;
   sync();
  },
  destroy() {
   stop();
   observer.disconnect();
   mobile.removeEventListener('change', reset);
   reduced.removeEventListener('change', reset);
   document.removeEventListener('visibilitychange', sync);
   if (current) clearFrames(current);
  },
 };
}

/** A scroll-linked playhead. Retain a small window of decoded images and seek in either direction. */
export function mountFrameScrub(
 host: HTMLElement,
 canvas: HTMLCanvasElement,
 sequence: FrameSequence,
 onStatus: (status: 'loading' | 'ready' | 'still') => void,
 onFrame?: (index: number) => void,
) {
 const context = canvas.getContext('2d', { alpha: sequence.alpha ?? false });
 if (!context) {
  onStatus('still');
  return;
 }
 const mobile = matchMedia(sequence.mobileQuery);
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 let controller = new AbortController();
 let chunks = new Map<number, Promise<Blob[]>>();
 let frames = new Map<number, DecodedFrame>();
 let decoding = new Set<number>();
 let visible = false;
 let disposed = false;
 let failed = false;
 let request = 0;
 let target = sequence.start;
 let last = -1;
 let direction = 1;
 const count = Math.ceil(sequence.frames / sequence.chunk);

 function clear() {
  cancelAnimationFrame(request);
  request = 0;
  controller.abort();
  controller = new AbortController();
  chunks = new Map();
  for (const frame of frames.values()) frame.close?.();
  frames = new Map();
  decoding = new Set();
  last = -1;
 }

 function loadChunk(index: number) {
  let cached = chunks.get(index);
  if (cached) return cached;
  const signal = controller.signal;
  cached = fetchChunk(sequence, mobile.matches ? 'mobile' : 'wide', index, signal);
  void cached.catch(() => {
   if (!signal.aborted) {
    failed = true;
    clear();
    onStatus('still');
   }
  });
  chunks.set(index, cached);
  return cached;
 }

 function queue() {
  if (!request && !disposed && !failed && visible && !reduced.matches && !document.hidden) {
   request = requestAnimationFrame(paint);
  }
 }

 function decode(index: number) {
  if (index < 0 || index >= sequence.frames || index === last || frames.has(index) || decoding.has(index) || decoding.size >= 3) return;
  const signal = controller.signal;
  decoding.add(index);
  void loadChunk(Math.floor(index / sequence.chunk))
   .then((blobs) => signal.aborted ? undefined : decodeFrame(blobs[index % sequence.chunk]))
   .then((frame) => {
    if (!frame) return;
    if (signal.aborted || Math.abs(index - target) > 8) frame.close?.();
    else frames.set(index, frame);
   })
   .catch(() => {
    if (!signal.aborted) {
     failed = true;
     clear();
     onStatus('still');
    }
   })
   .finally(() => {
    if (!signal.aborted) {
     decoding.delete(index);
     queue();
    }
   });
 }

 function paint() {
  request = 0;
  if (!context || !visible || document.hidden) return;
  const chunk = Math.floor(target / sequence.chunk);
  for (const index of chunks.keys()) {
   if (Math.abs(index - chunk) > 2) chunks.delete(index);
  }
  let chosen = last;
  for (const [index, frame] of frames) {
   if (Math.abs(index - target) > 6) {
    frame.close?.();
    frames.delete(index);
   } else if (chosen < 0 || Math.abs(index - target) < Math.abs(chosen - target)) chosen = index;
  }
  const frame = frames.get(chosen);
  if (chosen !== last && frame) {
   const first = last < 0;
   paintFrame(canvas, context, frame, sequence.alpha);
   last = chosen;
   onFrame?.(chosen);
   if (first) onStatus('ready');
  }
  decode(target);
  decode(target + direction);
  decode(target + 2 * direction);
  decode(target - direction);
  const nextChunk = chunk + direction;
  if (nextChunk >= 0 && nextChunk < count) void loadChunk(nextChunk);
 }

 function configure() {
  failed = false;
  clear();
  onStatus(reduced.matches ? 'still' : 'loading');
  queue();
 }
 const observer = new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting;
  queue();
 }, { rootMargin: '120px 0px' });
 observer.observe(host);
 mobile.addEventListener('change', configure);
 reduced.addEventListener('change', configure);
 document.addEventListener('visibilitychange', queue);
 configure();

 return {
  seek(progress: number) {
   const next = Math.round(Math.min(1, Math.max(0, progress)) * (sequence.frames - 1));
   if (Math.abs(next - target) > sequence.chunk * 2 && chunks.size) clear();
   if (next !== target) direction = next < target ? -1 : 1;
   target = next;
   queue();
  },
  destroy() {
   disposed = true;
   clear();
   observer.disconnect();
   mobile.removeEventListener('change', configure);
   reduced.removeEventListener('change', configure);
   document.removeEventListener('visibilitychange', queue);
  },
 };
}
