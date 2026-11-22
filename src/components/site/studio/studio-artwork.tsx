"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { ImageValue } from "@/lib/types";
import { EditableImage } from "../editable";
import type { StudioPlayer } from "./studio-runtime";
import styles from "../motion-story.module.css";

export function StudioArtwork({ model, mode, stage, runway, poster, editable, priority, paused, ready, onReady, onChange }: {
  model: string;
  mode: "loop" | "scroll" | "still";
  stage: RefObject<HTMLDivElement | null>;
  runway: RefObject<HTMLDivElement | null>;
  poster: ImageValue;
  editable: boolean;
  priority: boolean;
  paused: boolean;
  ready: boolean;
  onReady: (value: boolean) => void;
  onChange: (image: ImageValue) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const player = useRef<StudioPlayer | null>(null);
  const pauseSetting = useRef(paused);
  useEffect(() => {
    pauseSetting.current = paused;
    player.current?.pause(paused);
  }, [paused]);

  useEffect(() => {
    const node = stage.current, path = runway.current, art = canvas.current;
    if (!node || !path || !art || mode === "still") return;
    let disposed = false;
    let frame = 0;
    let travel = 0;
    let stickyTop = 0;

    function seek() {
      frame = 0;
      if (path) player.current?.seek(travel > 0 ? (stickyTop - path.getBoundingClientRect().top) / travel : 0);
    }
    function queue() {
      if (!frame) frame = requestAnimationFrame(seek);
    }
    function measure() {
      if (!path || !node) return;
      stickyTop = parseFloat(getComputedStyle(node).top) || 0;
      travel = path.offsetHeight - node.offsetHeight;
      queue();
    }

    const sizes = new ResizeObserver(measure);
    if (mode === "scroll") {
      sizes.observe(path);
      window.addEventListener("scroll", queue, { passive: true });
    }
    void Promise.all([import("./studio-runtime"), import("./model-sequence")]).then(([runtime, studio]) => {
      if (disposed) return;
      player.current = runtime.mountStudio(art, node, studio.modelSequence(model), {
        mode,
        ready: value => { onReady(value); measure(); },
      });
      player.current.pause(pauseSetting.current);
    }).catch(() => { if (!disposed) onReady(false); });

    return () => {
      disposed = true;
      player.current?.destroy();
      player.current = null;
      onReady(false);
      sizes.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", queue);
    };
  }, [mode, model, stage, runway, onReady]);

  return <div className={styles.studioArt}>
    {(!ready || editable) && <EditableImage image={poster} editable={editable} editLabel="Standbild bearbeiten"
      priority={priority} className={styles.studioPoster} sizes="(max-width: 720px) 54vw, 740px" onChange={onChange} />}
    <canvas ref={canvas} data-ready={ready} aria-hidden="true" />
  </div>;
}
