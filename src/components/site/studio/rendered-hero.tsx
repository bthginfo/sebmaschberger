"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { mountFrameLoop, mountFrameScrub, type FrameTake } from "./frame-loop";
import { mountPhotoTimeline, type PhotoTake } from "./photo-motion";
import styles from "./rendered-hero.module.css";

type Take = FrameTake | PhotoTake;
const isPhoto = (take: Take): take is PhotoTake => "draw" in take;

export function RenderedHero({ take, playback = "auto", mobileQuery = "(max-width: 640px)",
  description, className, children }: {
  take: Take;
  playback?: "auto" | "scroll";
  mobileQuery?: string;
  description?: string;
  className?: string;
  children?: ReactNode;
}) {
  const id = useId();
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const art = useRef<HTMLCanvasElement>(null);
  const player = useRef<{ pause(value: boolean): void } | undefined>(undefined);
  const [status, setStatus] = useState<"loading" | "ready" | "still">("loading");
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const path = track.current, host = stage.current, canvas = art.current;
    if (!path || !host || !canvas) return;
    const start = isPhoto(take) ? 0 : take.start;
    const cue = (position: number) => {
      host.dataset.cue = String(take.cuts.filter(cut => position >= cut).length);
    };
    const configure = (value: "loading" | "ready" | "still") => {
      setStatus(value);
      if (value !== "ready") {
        setFinished(false);
        setPaused(false);
        cue(start);
      }
    };
    function bindScroll(seekTo: (progress: number) => void) {
      let request = 0;
      const seek = () => {
        request = 0;
        if (!path || !host) return;
        const height = host.offsetHeight, inset = parseFloat(getComputedStyle(host).top) || 0;
        const viewport = window.visualViewport?.height ?? window.innerHeight;
        const travel = Math.max(0, path.offsetHeight - height);
        const margin = Math.max(0, viewport - height - inset);
        const hold = Math.min(travel * .55, margin + Math.max(72, Math.min(144, viewport * .14)));
        const distance = travel - hold;
        seekTo(distance > 0 ? (inset - path.getBoundingClientRect().top) / distance : 0);
      };
      const queue = () => { if (!request) request = requestAnimationFrame(seek); };
      const resize = new ResizeObserver(queue);
      if (path && host) { resize.observe(path); resize.observe(host); }
      window.addEventListener("scroll", queue, { passive: true });
      window.visualViewport?.addEventListener("resize", queue);
      seek();
      return () => {
        cancelAnimationFrame(request);
        resize.disconnect();
        window.removeEventListener("scroll", queue);
        window.visualViewport?.removeEventListener("resize", queue);
      };
    }
    if (isPhoto(take)) {
      const timeline = mountPhotoTimeline(host, canvas, take, playback === "auto" ? "autoplay" : "scroll", {
        ready: ready => configure(ready ? "ready" : "still"),
        progress(progress) {
          cue(progress);
          if (playback === "auto" && progress >= 1) setFinished(true);
        },
      });
      player.current = timeline;
      const unbind = playback === "scroll" ? bindScroll(timeline.seek) : undefined;
      return () => { unbind?.(); timeline.destroy(); player.current = undefined; };
    }
    const sequence = { ...take, mobileQuery };
    if (playback === "auto") {
      const timeline = mountFrameLoop(host, canvas, sequence,
        ready => configure(ready ? "ready" : "still"),
        () => {},
        frame => {
          cue(frame);
          if (take.once && frame === take.frames - 1) setFinished(true);
        });
      player.current = timeline;
      return () => {
        timeline?.destroy();
        player.current = undefined;
      };
    }
    const timeline = mountFrameScrub(host, canvas, sequence, configure, cue);
    const unbind = timeline ? bindScroll(timeline.seek) : undefined;
    return () => {
      unbind?.();
      timeline?.destroy();
    };
  }, [take, playback, mobileQuery]);

  function toggle() {
    const next = finished ? false : !paused;
    if (finished) setFinished(false);
    setPaused(next);
    player.current?.pause(next);
  }

  return <div ref={track} className={[styles.track, className].filter(Boolean).join(" ")} data-playback={playback} data-status={status} data-photo={isPhoto(take) || undefined}>
    <div ref={stage} className={styles.stage} data-cue={take.cuts.filter(cut => (isPhoto(take) ? 0 : take.start) >= cut).length}>
      <div id={id} className={styles.art} role={description ? "img" : undefined}
        aria-label={description} aria-hidden={!description || undefined}>
        {isPhoto(take) ? <img className={styles.poster} src={take.poster} style={{ objectPosition: take.focus + "% center" }}
          loading={playback === "scroll" ? "eager" : "lazy"} decoding="async" alt="" /> : <picture className={styles.poster}>
          <source media={mobileQuery} srcSet={take.base + "/mobile.webp"} width={take.mobile.width} height={take.mobile.height} />
          <img src={take.base + "/wide.webp"} width={take.wide.width} height={take.wide.height}
            loading={playback === "scroll" ? "eager" : "lazy"} decoding="async" alt="" />
        </picture>}
        <canvas ref={art} />
      </div>
      {children && <div className={styles.copy}>{children}</div>}
      {playback === "auto" && status === "ready" && <button type="button" className={styles.pause} aria-controls={id}
        aria-label={finished ? "Animation erneut abspielen" : paused ? "Animation fortsetzen" : "Animation pausieren"} onClick={toggle}>
        {finished ? <RotateCcw size={18} aria-hidden="true" /> : paused ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
      </button>}
    </div>
  </div>;
}
