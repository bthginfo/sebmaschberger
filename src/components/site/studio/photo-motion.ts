export type Point = readonly [number, number];
export type Quad = readonly [Point, Point, Point, Point];
export type Rect = readonly [number, number, number, number];

type Options = { opacity?: number; exposure?: number; radius?: number };
export type PhotoView = { width: number; height: number; aspect: number };
type Draw = {
  view: PhotoView;
  camera(x: number, y: number, zoom?: number, width?: number, height?: number): void;
  image(name: string, destination: Rect | Quad, options?: Options, source?: Rect): void;
  light(x: number, y: number, w: number, h: number, color: readonly [number, number, number], strength: number): void;
  shadow(x: number, y: number, w: number, h: number, strength: number): void;
};
export type PhotoTake = {
  poster: string;
  focus: number;
  seconds: number;
  cuts: readonly number[];
  images: Readonly<Record<string, string>>;
  draw: (stage: Draw, progress: number, seconds: number) => void;
  idle?: boolean;
};

export const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const between = (a: number, b: number, t: number) => a + (b - a) * t;
export function ease(a: number, b: number, x: number) {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

const vertex = `
attribute vec3 p;
attribute vec2 uv;
varying vec2 coordinate;
void main() {
  gl_Position = vec4(p.x, p.y, 0., p.z);
  coordinate = uv;
}`;
const fragment = `
precision mediump float;
varying vec2 coordinate;
uniform sampler2D photo;
uniform vec4 crop;
uniform vec4 paint;
uniform vec2 size;
uniform float radius;
uniform float mode;
uniform float exposure;
void main() {
  if (mode > .5) {
    vec2 xy = (coordinate - .5) * 2.;
    float d = dot(xy, xy);
    float amount = exp(-3.4 * d) * (1. - smoothstep(.5, 1., d)) * paint.a;
    gl_FragColor = vec4(paint.rgb * amount, amount);
  } else {
    float coverage = 1.;
    if (radius > 0.) {
      vec2 q = abs(coordinate - .5) * size - size * .5 + vec2(radius);
      float edge = length(max(q, vec2(0.))) + min(max(q.x, q.y), 0.) - radius;
      coverage = 1. - smoothstep(-.65, .65, edge);
    }
    vec4 texel = texture2D(photo, crop.xy + coordinate * crop.zw);
    gl_FragColor = vec4(texel.rgb * exposure, texel.a) * paint.a * coverage;
  }
}`;

function quadOf(destination: Rect | Quad): Quad {
  if (typeof destination[0] !== 'number') return destination as Quad;
  const [x, y, w, h] = destination as Rect;
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
}

function createRenderer(canvas: HTMLCanvasElement, images: Map<string, HTMLImageElement>) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl || gl.isContextLost()) return null;
  function compile(type: number, code: string) {
    const shader = gl!.createShader(type);
    if (!shader) return null;
    gl!.shaderSource(shader, code);
    gl!.compileShader(shader);
    if (gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) return shader;
    gl!.deleteShader(shader);
    return null;
  }
  const vs = compile(gl.VERTEX_SHADER, vertex), fs = compile(gl.FRAGMENT_SHADER, fragment);
  const program = gl.createProgram(), buffer = gl.createBuffer();
  if (!vs || !fs || !program || !buffer) {
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
    if (program) gl.deleteProgram(program);
    if (buffer) gl.deleteBuffer(buffer);
    return null;
  }
  gl.attachShader(program, vs); gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs); gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program); gl.deleteBuffer(buffer); return null;
  }

  const textures = new Map<string, { texture: WebGLTexture; width: number; height: number }>();
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  for (const [name, image] of images) {
    const texture = gl.createTexture();
    if (!texture) continue;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    textures.set(name, { texture, width: image.naturalWidth, height: image.naturalHeight });
  }
  if (textures.size !== images.size) {
    for (const item of textures.values()) gl.deleteTexture(item.texture);
    gl.deleteProgram(program); gl.deleteBuffer(buffer); return null;
  }

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  const p = gl.getAttribLocation(program, 'p'), uv = gl.getAttribLocation(program, 'uv');
  gl.enableVertexAttribArray(p); gl.enableVertexAttribArray(uv);
  gl.vertexAttribPointer(p, 3, gl.FLOAT, false, 20, 0);
  gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 20, 12);
  gl.enable(gl.BLEND);
  const crop = gl.getUniformLocation(program, 'crop'), paint = gl.getUniformLocation(program, 'paint');
  const size = gl.getUniformLocation(program, 'size'), radius = gl.getUniformLocation(program, 'radius');
  const mode = gl.getUniformLocation(program, 'mode'), exposure = gl.getUniformLocation(program, 'exposure');
  const points = new Float32Array(20);
  gl.bufferData(gl.ARRAY_BUFFER, points.byteLength, gl.DYNAMIC_DRAW);

  const view: PhotoView = { width: 1, height: 1, aspect: 1 };
  let scale = 1, originX = 0, originY = 0;
  function submit(q: Quad) {
    const [a, b, c, d] = q;
    // Homogeneous weights keep both triangles on the same projective plane.
    const x = a[0] - b[0] + c[0] - d[0], y = a[1] - b[1] + c[1] - d[1];
    const bx = b[0] - c[0], by = b[1] - c[1], dx = d[0] - c[0], dy = d[1] - c[1];
    const det = bx * dy - dx * by;
    const g = Math.abs(det) > .0001 ? (x * dy - dx * y) / det : 0;
    const h = Math.abs(det) > .0001 ? (bx * y - x * by) / det : 0;
    for (let j = 0; j < 4; j++) {
      const i = j === 2 ? 3 : j === 3 ? 2 : j;
      const v = j * 5, u = i === 1 || i === 2 ? 1 : 0, w = i >= 2 ? 1 : 0;
      const weight = 1 + g * u + h * w;
      points[v] = ((q[i][0] * scale + originX) / view.width * 2 - 1) * weight;
      points[v + 1] = (1 - (q[i][1] * scale + originY) / view.height * 2) * weight;
      points[v + 2] = weight;
      points[v + 3] = u; points[v + 4] = w;
    }
    gl!.bufferSubData(gl!.ARRAY_BUFFER, 0, points);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
  }
  function soft(x: number, y: number, w: number, h: number, color: readonly [number, number, number], strength: number, additive: boolean) {
    if (strength <= .001) return;
    gl!.blendFunc(gl!.ONE, additive ? gl!.ONE : gl!.ONE_MINUS_SRC_ALPHA);
    gl!.uniform1f(mode, 1);
    gl!.uniform4f(paint, ...color, strength);
    submit(quadOf([x - w * .5, y - h * .5, w, h]));
  }
  const draw: Draw = {
    view,
    camera(x, y, zoom = 1, width = 1536, height = 1024) {
      scale = Math.max(view.width / width, view.height / height) * Math.max(1, zoom);
      const halfWidth = view.width / (2 * scale), halfHeight = view.height / (2 * scale);
      originX = view.width * .5 - Math.min(width - halfWidth, Math.max(halfWidth, x)) * scale;
      originY = view.height * .5 - Math.min(height - halfHeight, Math.max(halfHeight, y)) * scale;
    },
    image(name, destination, options = {}, source) {
      const item = textures.get(name);
      if (!item || (options.opacity ?? 1) <= .001) return;
      const q = quadOf(destination);
      gl.bindTexture(gl.TEXTURE_2D, item.texture);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform1f(mode, 0);
      gl.uniform1f(exposure, options.exposure ?? 1);
      gl.uniform1f(radius, options.radius ?? 0);
      gl.uniform2f(size, Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]), Math.hypot(q[3][0] - q[0][0], q[3][1] - q[0][1]));
      const [x, y, w, h] = source ?? [0, 0, item.width, item.height];
      gl.uniform4f(crop, x / item.width, y / item.height, w / item.width, h / item.height);
      gl.uniform4f(paint, 1, 1, 1, options.opacity ?? 1);
      submit(q);
    },
    light(x, y, w, h, color, strength) { soft(x, y, w, h, color, strength, true); },
    shadow(x, y, w, h, strength) { soft(x, y, w, h, [0, 0, 0], strength, false); },
  };
  return {
    paint(take: PhotoTake, progress: number, time: number) {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h || gl.isContextLost()) return false;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.6, 1920 / Math.max(w, h));
      const width = Math.max(1, Math.round(w * ratio)), height = Math.max(1, Math.round(h * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width; canvas.height = height;
      }
      view.width = width; view.height = height; view.aspect = width / height;
      gl.viewport(0, 0, width, height);
      gl.clearColor(.035, .04, .06, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      draw.camera(768, 512);
      take.draw(draw, progress, time);
      return true;
    },
    destroy() {
      for (const item of textures.values()) gl.deleteTexture(item.texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}

export function mountPhotoTimeline(
  host: HTMLElement, canvas: HTMLCanvasElement, take: PhotoTake, mode: 'autoplay' | 'scroll',
  callbacks: { ready(value: boolean): void; running?(value: boolean): void; progress(value: number): void },
) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let renderer: ReturnType<typeof createRenderer> = null;
  let pictures: Map<string, HTMLImageElement> | undefined;
  let loading = false, failed = false, near = false, visible = false, disposed = false;
  let paused = false, ready = false, running = false, request = 0;
  let value = 0, elapsed = 0, ambient = 0, previous = 0;
  const isSaveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
  function setReady(next: boolean) { if (ready !== next) { ready = next; callbacks.ready(next); } }
  function setRunning(next: boolean) { if (running !== next) { running = next; callbacks.running?.(next); } }
  function stop() { cancelAnimationFrame(request); request = 0; previous = 0; setRunning(false); }
  function schedule() {
    if (!request && visible && renderer && !document.hidden && !motion.matches) request = requestAnimationFrame(paint);
  }
  function paint(now: number) {
    request = 0;
    if (!renderer || !visible || document.hidden || motion.matches) { stop(); return; }
    const delta = previous ? Math.min(.06, (now - previous) / 1000) : 0;
    previous = now;
    if (mode === 'autoplay' && !paused) {
      elapsed = Math.min(take.seconds, elapsed + delta);
      value = elapsed / take.seconds;
    }
    if (!paused && (mode === 'scroll' || value < 1)) ambient += delta;
    if (!renderer.paint(take, value, ambient)) { stop(); return; }
    setReady(true);
    callbacks.progress(value);
    const advancing = mode === 'autoplay' && !paused && value < 1;
    setRunning(advancing);
    if (advancing || (mode === 'scroll' && take.idle && value < .14)) schedule();
    else previous = 0;
  }
  async function load() {
    if (disposed || loading || failed || renderer || !near || motion.matches || isSaveData) return;
    loading = true;
    try {
      if (!pictures) {
        const assets = await Promise.all(Object.entries(take.images).map(async ([name, src]) => {
          const image = new Image();
          image.src = src;
          await image.decode();
          return [name, image] as const;
        }));
        pictures = new Map(assets);
      }
      if (disposed || motion.matches) return;
      renderer = createRenderer(canvas, pictures);
      failed = !renderer;
      schedule();
    } catch { failed = true; }
    finally { loading = false; }
  }
  const prefetch = new IntersectionObserver(([entry]) => {
    near = entry.isIntersecting;
    if (near) void load();
  }, { rootMargin: '200px 0px' });
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) schedule(); else stop();
  });
  const resize = new ResizeObserver(schedule);
  const visibility = () => { if (document.hidden) stop(); else schedule(); };
  const preference = () => {
    if (motion.matches) { stop(); setReady(false); callbacks.progress(0); }
    else { void load(); schedule(); }
  };
  const lost = (event: Event) => { event.preventDefault(); stop(); renderer = null; setReady(false); callbacks.progress(0); };
  const restored = () => { failed = false; void load(); };
  prefetch.observe(host); intersection.observe(host); resize.observe(canvas);
  document.addEventListener('visibilitychange', visibility);
  motion.addEventListener('change', preference);
  canvas.addEventListener('webglcontextlost', lost);
  canvas.addEventListener('webglcontextrestored', restored);
  return {
    seek(progress: number) { value = clamp(progress); schedule(); },
    pause(next: boolean) {
      paused = next;
      if (!next && elapsed >= take.seconds) { elapsed = 0; value = 0; ambient = 0; }
      schedule();
    },
    destroy() {
      disposed = true;
      stop();
      prefetch.disconnect(); intersection.disconnect(); resize.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      motion.removeEventListener('change', preference);
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
      renderer?.destroy();
      renderer = null;
      pictures = undefined;
    },
  };
}
