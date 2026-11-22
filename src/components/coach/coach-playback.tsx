"use client";

import { Maximize2, Pause, Play, Repeat2, Repeat1, SkipBack, SkipForward } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useAdminLanguage } from "@/components/admin/admin-language";
import { frameAt, frameTimes, playDuration } from "@/lib/coach/model";
import type { CoachPlay } from "@/lib/coach/model";
import { IconButton, coachText } from "./coach-ui";
import styles from "./studio.module.css";

type LoopMode = "off" | "all" | "phase";

export function useCoachPlayback(play: CoachPlay) {
  const duration = useMemo(() => playDuration(play), [play]);
  const times = useMemo(() => frameTimes(play), [play]);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [loop, setLoopMode] = useState<LoopMode>("off");
  const current = useRef(0);
  const loopPhase = useRef(0);

  const move = useCallback((value: number) => {
    current.current = Math.max(0, Math.min(value, duration));
    setTime(current.current);
  }, [duration]);

  const seek = useCallback((value: number) => {
    move(value);
    loopPhase.current = frameAt(play, current.current);
  }, [move, play]);

  const setLoop = useCallback((mode: LoopMode) => {
    loopPhase.current = frameAt(play, current.current);
    setLoopMode(mode);
  }, [play]);

  useEffect(() => {
    if (!playing || !duration) return;
    const pauseWhenHidden = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    let previous: number | null = null;
    let animation = 0;
    const tick = (now: number) => {
      if (previous === null) previous = now;
      const next = current.current + Math.min(now - previous, 100) / 1000 * rate;
      previous = now;
      const start = loop === "phase" ? times[loopPhase.current] ?? 0 : 0;
      const end = loop === "phase" ? times[loopPhase.current + 1] ?? duration : duration;
      if (next >= end && (loop === "off" || end <= start)) {
        move(end);
        setPlaying(false);
        return;
      }
      move(next >= end ? start + (next - start) % (end - start) : next);
      animation = requestAnimationFrame(tick);
    };
    animation = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animation);
      document.removeEventListener("visibilitychange", pauseWhenHidden);
    };
  }, [duration, loop, move, playing, rate, times]);

  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => {
    if (!duration) return;
    if (!playing && current.current >= duration) {
      const phaseStart = times[loopPhase.current] ?? 0;
      seek(loop === "phase" && phaseStart < duration ? phaseStart : 0);
    }
    setPlaying(!playing);
  }, [duration, loop, playing, seek, times]);

  return { time: Math.min(time, duration), duration, playing, rate, loop, seek, pause, toggle, setRate, setLoop };
}

type Playback = ReturnType<typeof useCoachPlayback>;

export function timeLabel(time: number, compact = false) {
  const deciseconds = Math.max(0, Math.round(time * 10));
  const seconds = Math.floor(deciseconds / 10);
  const display = Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
  return compact ? display : display + "." + deciseconds % 10;
}

export function CoachTransport({ play, playback, onSeek, onPlay, onPhase, onFocus, index }: {
  play: CoachPlay;
  playback: Playback;
  onSeek?: (time: number) => void;
  onPlay?: () => void;
  onPhase?: (index: number) => void;
  onFocus?: (initiator: HTMLButtonElement) => void;
  index?: number;
}) {
  const { language } = useAdminLanguage(play.locale);
  const t = (de: string, en: string) => coachText(language, de, en);
  const times = useMemo(() => frameTimes(play), [play]);
  const selected = index ?? Math.max(0, times.findLastIndex(start => start <= playback.time));
  const progress = playback.duration ? playback.time / playback.duration * 100 : 0;
  const loopLabels = {
    off: t("Aus", "Off"),
    all: t("Ganze Taktik", "Entire play"),
    phase: t("Aktuelle Phase", "Current phase"),
  };
  const Repeat = playback.loop === "phase" ? Repeat1 : Repeat2;
  const seek = (time: number) => {
    playback.pause();
    if (onSeek) onSeek(time);
    else playback.seek(time);
  };
  const phase = (next: number) => {
    playback.pause();
    if (onPhase) onPhase(next);
    else seek(times[next] ?? 0);
  };
  return <div className={styles.transport} role="group" aria-label={t("Wiedergabe", "Playback")}>
    <div className={styles.transportButtons}>
      <IconButton icon={SkipBack} label={t("Vorherige Phase", "Previous phase")} onClick={() => phase(selected - 1)} disabled={selected === 0} />
      <IconButton className={styles.playButton} icon={playback.playing ? Pause : Play}
        label={playback.playing ? t("Pausieren", "Pause") : t("Abspielen", "Play")}
        onClick={onPlay ?? playback.toggle} disabled={playback.duration === 0} />
      <IconButton icon={SkipForward} label={t("Nächste Phase", "Next phase")} onClick={() => phase(selected + 1)} disabled={selected >= times.length - 1} />
    </div>
    <div className={styles.scrubber}>
      <select className={styles.phasePicker} aria-label={t("Phase auswählen", "Choose phase")} value={selected}
        onChange={event => phase(Number(event.target.value))} disabled={play.frames.length < 2}>
        {play.frames.map((frame, number) => <option key={frame.id} value={number}>
          {t("Phase", "Phase")} {number + 1}{frame.title ? " · " + frame.title : ""}
        </option>)}
      </select>
      <div className={styles.seekTrack} style={{ "--progress": progress + "%" } as CSSProperties}>
        <input type="range" min={0} max={playback.duration || 1} step={0.01} value={playback.time}
          aria-label={t("Abspielposition", "Playback position")} aria-valuetext={timeLabel(playback.time)}
          onChange={(event) => seek(Number(event.target.value))}
          onKeyDown={event => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            const direction = event.key === "ArrowRight" ? 1 : -1;
            const step = event.shiftKey ? 5 : 0.5;
            seek(Math.min(playback.duration, Math.max(0, playback.time + direction * step)));
          }} disabled={playback.duration === 0} />
        {playback.duration > 0 && <div className={styles.seekTicks} aria-hidden="true">
          {times.slice(1).filter((time) => time < playback.duration).map((time) => <i key={time} style={{ left: time / playback.duration * 100 + "%" }} />)}
        </div>}
      </div>
      <span className={styles.timeReadout} aria-hidden="true">{timeLabel(playback.time)} <span>/</span> {timeLabel(playback.duration)}</span>
    </div>
    <div className={styles.transportExtras}>
      <select aria-label={t("Wiedergabetempo", "Playback speed")} value={playback.rate} onChange={(event) => playback.setRate(Number(event.target.value))}>
        {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => <option key={rate} value={rate}>{rate.toLocaleString(language)}×</option>)}
      </select>
      {playback.duration > 0 && <details className={styles.loopMenu} onBlur={(event) => {
        if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
      }} onKeyDown={(event) => {
        if (event.key === "Escape" && event.currentTarget.open) {
          event.stopPropagation();
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}>
        <summary data-loop={playback.loop !== "off" || undefined} aria-label={t("Wiederholung", "Loop") + " · " + loopLabels[playback.loop]}
          title={t("Wiederholung", "Loop")}><Repeat size={18} aria-hidden="true" /></summary>
        <div className={styles.menuSheet}>
          {(["off", "all", "phase"] as const).map((mode) => <button type="button" key={mode} aria-pressed={playback.loop === mode} onClick={(event) => {
            playback.setLoop(mode);
            const menu = event.currentTarget.closest("details");
            if (menu) menu.open = false;
            menu?.querySelector("summary")?.focus();
          }}>{loopLabels[mode]}</button>)}
        </div>
      </details>}
      {onFocus && <IconButton className={styles.focusTrigger} icon={Maximize2} label={t("Vollbild öffnen", "Enter fullscreen")} aria-keyshortcuts="F" onClick={(event) => onFocus(event.currentTarget)} />}
    </div>
  </div>;
}
