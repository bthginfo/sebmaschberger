"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { frameAt } from "@/lib/coach/model";
import type { CoachPlay } from "@/lib/coach/model";
import { paintCoachBoard } from "@/lib/coach/motion-dom";
import { renderCoachBoard } from "@/lib/coach/scene";
import { CoachPitch } from "./coach-ui";
import type { CoachLocale } from "./coach-ui";

type Props = Omit<ComponentPropsWithoutRef<"div">, "children" | "dangerouslySetInnerHTML"> & {
  play: CoachPlay;
  time: number;
  locale: CoachLocale;
};

export function CoachMotionPitch({ play, time, locale, ...props }: Props) {
  const pitch = useRef<HTMLDivElement>(null);
  const phase = frameAt(play, time);
  const svg = useMemo(() => renderCoachBoard(play, 0, {
    frameIndex: phase,
    variant: "play",
    routes: true,
    locale,
  }), [locale, phase, play]);

  useLayoutEffect(() => {
    if (pitch.current) paintCoachBoard(pitch.current, play, time);
  }, [play, svg, time]);

  return <CoachPitch ref={pitch} svg={svg} {...props} />;
}
