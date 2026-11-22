import { AnimationMixer, Box3, LoopOnce, Mesh, PerspectiveCamera, PlaneGeometry, ShadowMaterial, Vector3 } from "three";
import { mix, smooth, studioLighting, type StudioSequence } from "./studio-runtime";

export function modelSequence(url: string, { story = false } = {}): StudioSequence {
  return {
    environment: "/assets/motion-story/models/studio.hdr",
    exposure: 1.12,
    async prepare({ scene, camera, model }) {
      const asset = await model(url, true);
      const clip = story
        ? asset.animations.find(animation => animation.name === "Story")
          ?? asset.animations.find(animation => animation.name !== "Ambient")
        : asset.animations[0];
      if (!clip || !Number.isFinite(clip.duration) || clip.duration <= 0) {
        throw new Error("Eine 3D-Szene benötigt eine Animation.");
      }
      const mixer = new AnimationMixer(asset.scene);
      mixer.clipAction(clip).setLoop(LoopOnce, 1).play();
      const ambientClip = story ? asset.animations.find(animation => animation.name === "Ambient" && animation.duration > 0) : undefined;
      const ambientMixer = ambientClip && new AnimationMixer(asset.scene);
      if (ambientMixer && ambientClip) ambientMixer.clipAction(ambientClip).play();
      asset.scene.traverse(node => {
        if (node instanceof Mesh) node.castShadow = node.receiveShadow = true;
      });
      const authoredCamera = asset.cameras.find(node => node instanceof PerspectiveCamera) as PerspectiveCamera | undefined;
      const bounds = new Box3().setFromObject(asset.scene);
      const center = bounds.getCenter(new Vector3());
      const dimensions = bounds.getSize(new Vector3());
      const extent = Math.max(0.01, dimensions.x, dimensions.y, dimensions.z);
      const floor = new Mesh(new PlaneGeometry(extent * 16, extent * 16), new ShadowMaterial({ opacity: 0.18, depthWrite: false }));
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(center.x, bounds.min.y - extent * 0.002, center.z);
      floor.receiveShadow = true;
      scene.add(floor);
      scene.environmentIntensity = 0.74;
      scene.environmentRotation.y = 1.03;
      const light = studioLighting(scene, "#fff1db", 1.95);
      light.position.copy(center).add(new Vector3(-extent, 2.1 * extent, 1.5 * extent));
      light.target.position.copy(center);
      light.shadow.camera.left = light.shadow.camera.bottom = -extent * 1.4;
      light.shadow.camera.right = light.shadow.camera.top = extent * 1.4;
      light.shadow.camera.far = extent * 12;
      light.shadow.camera.updateProjectionMatrix();
      const direction = new Vector3();
      return {
        duration: clip.duration,
        ambient: Boolean(ambientMixer),
        update(progress, size, dt) {
          mixer.setTime(Math.min(clip.duration - 0.0001, progress * clip.duration));
          ambientMixer?.update(dt);
          asset.scene.updateMatrixWorld(true);
          const narrow = smooth(1.65, 0.91, size.aspect);
          camera.near = Math.max(0.001, extent / 190);
          camera.far = Math.max(100, extent * 64);
          if (authoredCamera) {
            authoredCamera.getWorldPosition(camera.position);
            authoredCamera.getWorldQuaternion(camera.quaternion);
            camera.fov = mix(authoredCamera.fov, Math.min(65, authoredCamera.fov * 1.48), narrow);
            camera.getWorldDirection(direction);
            camera.position.addScaledVector(direction, -extent * narrow * 0.47);
          } else {
            const distance = extent * mix(1.7, 2.82, narrow);
            camera.position.copy(center).add(new Vector3(distance * 0.36, distance * 0.36, distance));
            camera.fov = 37;
            camera.lookAt(center);
          }
          camera.updateProjectionMatrix();
        },
        dispose() {
          mixer.stopAllAction();
          mixer.uncacheRoot(asset.scene);
          ambientMixer?.stopAllAction();
          ambientMixer?.uncacheRoot(asset.scene);
        },
      };
    },
  };
}
