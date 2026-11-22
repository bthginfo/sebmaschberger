import {
	ACESFilmicToneMapping, Color, DirectionalLight, Group, HemisphereLight, LoadingManager, Mesh, PCFShadowMap,
	PerspectiveCamera, PMREMGenerator, Scene, SRGBColorSpace, Texture, WebGLRenderer,
	type Material, type Object3D, type WebGLRenderTarget
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { advanceMotionProgress } from '@/lib/motion-progress';

export type StudioSize = { width: number; height: number; aspect: number };
export type StudioShot = {
	duration: number;
	ambient?: boolean;
	update: (progress: number, size: StudioSize, dt: number) => void;
	beforeRender?: (renderer: WebGLRenderer) => void;
	dispose?: () => void;
};
export type StudioContext = {
	scene: Scene;
	camera: PerspectiveCamera;
	model: (url: string, embedded?: boolean) => ReturnType<GLTFLoader['loadAsync']>;
};
export type StudioSequence = {
	environment?: string;
	exposure?: number;
	start?: number;
	prepare: (context: StudioContext) => Promise<StudioShot>;
};
export type StudioPlayer = {
	pause: (paused: boolean) => void;
	seek: (progress: number) => void;
	destroy: () => void;
};

export const clamp = (value: number) => Math.max(0, Math.min(1, value));
export const smooth = (start: number, end: number, value: number) => {
	const x = clamp((value - start) / (end - start));
	return x * x * (3 - 2 * x);
};
export const mix = (start: number, end: number, ratio: number) => start + (end - start) * ratio;

export function studioLighting(scene: Scene, color = '#fff2e2', intensity = 2.2) {
	const key = new DirectionalLight(color, intensity);
	key.position.set(-3.4, 6.5, 4.5);
	key.castShadow = true;
	key.shadow.mapSize.set(1024, 1024);
	key.shadow.camera.left = -4.2;
	key.shadow.camera.right = 4.2;
	key.shadow.camera.top = 4.2;
	key.shadow.camera.bottom = -4.2;
	key.shadow.normalBias = 0.014;
	key.shadow.bias = -0.00012;
	scene.add(key, key.target, new HemisphereLight('#fff6e6', '#85715c', 0.62));
	return key;
}

export function disposeStudio(root: Object3D) {
	const materials = new Set<Material>();
	const textures = new Set<Texture>();
	const geometries = new Set<Mesh['geometry']>();
	root.traverse(node => {
		if (!(node instanceof Mesh)) return;
		geometries.add(node.geometry);
		for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
			materials.add(material);
			for (const value of Object.values(material)) {
				if (value instanceof Texture) textures.add(value);
			}
		}
	});
	for (const geometry of geometries) geometry.dispose();
	for (const material of materials) material.dispose();
	for (const texture of textures) texture.dispose();
}

export function mountStudio(
	canvas: HTMLCanvasElement,
	host: HTMLElement,
	sequence: StudioSequence,
	options: { mode?: 'loop' | 'scroll'; motionQuery?: string; loopReset?: (opacity: number) => void; ready: (value: boolean) => void; progress?: (value: number) => void; running?: (value: boolean) => void }
): StudioPlayer {
	const motion = matchMedia(options.motionQuery ?? '(prefers-reduced-motion: reduce)');
	const scene = new Scene();
	const camera = new PerspectiveCamera(33, 1, 0.028, 170);
	const models = new Group();
	scene.add(models);
	const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
	let environment: WebGLRenderTarget | undefined;
	let renderer: WebGLRenderer | undefined;
	let shot: StudioShot | undefined;
	let size: StudioSize = { width: 1, height: 1, aspect: 1 };
	let visible = false;
	let paused = false;
	let loading = false;
	let failed = false;
	let disposed = false;
	let request = 0;
	let lastTick = 0;
	let elapsed = 0;
	let progress = 0;
	let target = 0;
	let running = false;
	const resetTime = .34;

	function signalRunning(value: boolean) {
		if (value === running) return;
		running = value;
		options.running?.(value);
	}

	const mayRun = () => !disposed && !failed && visible && !motion.matches && !document.hidden;
	function resize() {
		if (!renderer || disposed) return;
		const width = Math.max(1, canvas.clientWidth);
		const height = Math.max(1, canvas.clientHeight);
		size = { width, height, aspect: width / height };
		const ratio = Math.min(devicePixelRatio || 1, width < 600 ? 1.4 : 1.65, Math.sqrt(1_250_000 / (width * height)));
		renderer.setPixelRatio(ratio);
		renderer.setSize(width, height, false);
		camera.aspect = size.aspect;
		camera.updateProjectionMatrix();
		if (shot && mayRun()) draw();
	}

	function draw(dt = 0) {
		if (!renderer || !shot) return;
		shot.update(progress, size, dt);
		shot.beforeRender?.(renderer);
		renderer.render(scene, camera);
		options.progress?.(progress);
	}

	function frame(time: number) {
		request = 0;
		if (!mayRun() || paused || !shot) return;
		const dt = lastTick ? Math.min((time - lastTick) / 1000, 0.042) : 1 / 60;
		lastTick = time;
		if (options.mode === 'scroll') {
			progress = advanceMotionProgress(progress, target, dt);
		} else if (options.loopReset) {
			elapsed = (elapsed + dt) % (shot.duration + resetTime * 2);
			progress = elapsed < shot.duration + resetTime ? clamp(elapsed / shot.duration) : 0;
			options.loopReset(elapsed <= shot.duration ? 0 : 1 - Math.abs((elapsed - shot.duration) / resetTime - 1));
		} else {
			elapsed = (elapsed + dt) % shot.duration;
			progress = elapsed / shot.duration;
		}
		draw(dt);
		queue();
	}

	function queue() {
		if (!request && mayRun() && !paused && shot && (options.mode !== 'scroll' || progress !== target || shot.ambient)) {
			request = requestAnimationFrame(frame);
			signalRunning(true);
		} else if (!request) {
			signalRunning(false);
		}
	}

	function stop() {
		cancelAnimationFrame(request);
		request = 0;
		lastTick = 0;
		signalRunning(false);
	}

	function fallback() {
		failed = true;
		stop();
		options.ready(false);
	}

	async function prepare() {
		loading = true;
		try {
			renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
			renderer.setClearColor(new Color('#17130e'), 0);
			renderer.outputColorSpace = SRGBColorSpace;
			renderer.toneMapping = ACESFilmicToneMapping;
			renderer.toneMappingExposure = sequence.exposure ?? 1.04;
			renderer.shadowMap.enabled = true;
			renderer.shadowMap.type = PCFShadowMap;
			const pmrem = new PMREMGenerator(renderer);
			const lighting = (async () => {
				const image = sequence.environment
					? await new HDRLoader().loadAsync(sequence.environment).catch(() => undefined)
					: undefined;
				try {
					if (disposed) return;
					if (image) environment = pmrem.fromEquirectangular(image);
					else {
						const room = new RoomEnvironment();
						environment = pmrem.fromScene(room, 0.04);
						room.dispose();
					}
					scene.environment = environment.texture;
				} finally {
					image?.dispose();
					pmrem.dispose();
				}
			})();
			const [built] = await Promise.all([
				sequence.prepare({ scene, camera, async model(url, embedded) {
					let source = loader;
					let missingResource = false;
					if (embedded) {
						const expected = new URL(url, location.origin).href;
						const resources = new LoadingManager();
						resources.onError = () => { missingResource = true; };
						resources.setURLModifier(value => {
							if (value.startsWith('blob:') || value.startsWith('data:') || new URL(value, location.origin).href === expected) return value;
							missingResource = true;
							throw new Error('The model must contain its own geometry and textures.');
						});
						source = new GLTFLoader(resources).setMeshoptDecoder(MeshoptDecoder);
					}
					const asset = await source.loadAsync(url);
					if (missingResource) {
						disposeStudio(asset.scene);
						throw new Error('The embedded model could not load all resources.');
					}
					if (disposed || failed) {
						disposeStudio(asset.scene);
						throw new Error('The scene was closed while loading.');
					}
					models.add(asset.scene);
					return asset;
				} }),
				lighting
			]);
			if (disposed || failed) {
				built.dispose?.();
				return;
			}
			shot = built;
			if (options.mode !== 'scroll') {
				progress = clamp(sequence.start ?? 0);
				elapsed = progress * shot.duration;
			} else {
				// Enter at the current document position on restore and deep links.
				progress = target;
			}
			resize();
			draw();
			options.ready(!motion.matches);
			queue();
		} catch {
			if (!disposed) fallback();
		}
	}

	function sync() {
		if (!mayRun()) {
			stop();
			if (motion.matches) options.ready(false);
			return;
		}
		if (!loading) void prepare();
		if (shot) {
			draw();
			options.ready(true);
			queue();
		}
	}

	const intersections = new IntersectionObserver(([entry]) => {
		visible = entry.isIntersecting;
		sync();
	}, { threshold: 0.06 });
	const sizes = new ResizeObserver(resize);
	intersections.observe(host);
	sizes.observe(canvas);
	motion.addEventListener('change', sync);
	document.addEventListener('visibilitychange', sync);
	canvas.addEventListener('webglcontextlost', fallback);

	return {
		pause(value) {
			paused = value;
			if (paused) stop();
			else queue();
		},
		seek(value) {
			target = clamp(value);
			queue();
		},
		destroy() {
			disposed = true;
			stop();
			intersections.disconnect();
			sizes.disconnect();
			motion.removeEventListener('change', sync);
			document.removeEventListener('visibilitychange', sync);
			canvas.removeEventListener('webglcontextlost', fallback);
			scene.traverse(node => {
				if (node instanceof DirectionalLight) node.shadow.dispose();
			});
			disposeStudio(scene);
			shot?.dispose?.();
			environment?.dispose();
			renderer?.dispose();
			renderer?.forceContextLoss();
		}
	};
}
