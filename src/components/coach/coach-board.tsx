"use client";

import { ChevronDown, Flag, Hand, Layers2, Route, Waypoints, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { frameAt, PITCH_HEIGHT, PITCH_WIDTH } from "@/lib/coach/model";
import type { CoachPiece, CoachPlay } from "@/lib/coach/model";
import { renderCoachBoard } from "@/lib/coach/scene";
import { paintCoachBoard } from "@/lib/coach/motion-dom";
import { useAdminLanguage } from "@/components/admin/admin-language";
import { CoachPitch, IconButton, PieceIcon, coachText, isStroke, pieceLabels, selectIcon as SelectIcon } from "./coach-ui";
import type { CoachKind, CoachLocale } from "./coach-ui";
import styles from "./studio.module.css";

export type CoachTool = "select" | CoachKind;
type Point = { x: number; y: number };
type Drag = { pointer: number; from: Point; phase: number } & (
  { type: "move"; piece: CoachPiece; handle?: "start" | "end" } |
  { type: "draw"; piece: CoachPiece } |
  { type: "pan"; centre: Point; units: number }
);

const simple = ["attack", "defence", "ball"] as const;
const arrows = ["run", "pass", "kick", "line"] as const;
const markings = ["zone", "ring", "label", "cone", "gate", "pad", "flag"] as const;
const setPieces = ["ruck", "scrum", "lineout"] as const;
const touchMarkers = new Set<CoachKind>(["attack", "defence", "ball", "cone", "ruck", "scrum", "lineout", "gate", "pad", "flag"]);
const min = 16;
const magnification = 2.15;
const centreOfPitch = { x: PITCH_WIDTH / 2, y: PITCH_HEIGHT / 2 };
const clamp = (value: number, low: number, high: number) => Math.round(Math.min(high, Math.max(low, value)));
const point = (x: number, y: number): Point => ({ x: clamp(x, min, PITCH_WIDTH - min), y: clamp(y, min, PITCH_HEIGHT - min) });
const boundCentre = (x: number, y: number): Point => ({
  x: clamp(x, PITCH_WIDTH / magnification / 2, PITCH_WIDTH - PITCH_WIDTH / magnification / 2),
  y: clamp(y, PITCH_HEIGHT / magnification / 2, PITCH_HEIGHT - PITCH_HEIGHT / magnification / 2),
});

function getPoint(element: HTMLElement, x: number, y: number) {
  const matrix = element.querySelector("svg")?.getScreenCTM();
  if (!matrix) return null;
  const position = new DOMPoint(x, y).matrixTransform(matrix.inverse());
  return point(position.x, position.y);
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function numberPlayer(kind: "attack" | "defence", items: CoachPiece[]) {
  const used = new Set(items.filter((piece) => piece.kind === kind).map((piece) => piece.label));
  let index = 1;
  while (used.has(String(index))) index += 1;
  return String(index);
}

function newPiece(kind: CoachKind, location: Point, items: CoachPiece[], locale: CoachLocale): CoachPiece {
  const base = { id: crypto.randomUUID(), kind, ...location, label: "" };
  if (kind === "attack" || kind === "defence") return { ...base, label: numberPlayer(kind, items) };
  if (kind === "label") return { ...base, label: coachText(locale, "Hinweis", "Note") };
  if (kind === "zone" || kind === "ring") {
    const width = kind === "ring" ? 112 : 150;
    const height = kind === "ring" ? 112 : 90;
    return { ...base, x: Math.min(base.x, PITCH_WIDTH - width - min), y: Math.min(base.y, PITCH_HEIGHT - height - min), width, height };
  }
  return base;
}

function endArrow(piece: CoachPiece, end: Point): CoachPiece {
  if (distance(piece, end) < 14) {
    const x = piece.x > PITCH_WIDTH - 140 ? piece.x - 116 : piece.x + 116;
    return { ...piece, x2: x, y2: piece.y };
  }
  return { ...piece, x2: end.x, y2: end.y };
}

export function translatePiece(piece: CoachPiece, dx: number, dy: number) {
  const xs = [piece.x, piece.x2 ?? piece.x + (piece.width ?? 0)];
  const ys = [piece.y, piece.y2 ?? piece.y + (piece.height ?? 0)];
  const deltaX = clamp(dx, Math.min(0, min - Math.min(...xs)), Math.max(0, PITCH_WIDTH - min - Math.max(...xs)));
  const deltaY = clamp(dy, Math.min(0, min - Math.min(...ys)), Math.max(0, PITCH_HEIGHT - min - Math.max(...ys)));
  return {
    ...piece, x: piece.x + deltaX, y: piece.y + deltaY,
    ...(piece.x2 === undefined ? {} : { x2: piece.x2 + deltaX }),
    ...(piece.y2 === undefined ? {} : { y2: piece.y2 + deltaY }),
  };
}

function dragPiece(drag: Exclude<Drag, { type: "pan" }>, end: Point) {
  const { piece } = drag;
  if (drag.type === "draw") return endArrow(piece, end);
  const dx = end.x - drag.from.x;
  const dy = end.y - drag.from.y;
  if (drag.handle === "start") return { ...piece, ...point(piece.x + dx, piece.y + dy) };
  if (drag.handle === "end") {
    const next = point((piece.x2 ?? piece.x) + dx, (piece.y2 ?? piece.y) + dy);
    return { ...piece, x2: next.x, y2: next.y };
  }
  return translatePiece(piece, dx, dy);
}

export function CoachBoard({ play, phase, time, previewing, tool, setTool, selectedId, select, changePiece, deletePiece, togglePlayback }: {
  play: CoachPlay;
  phase: number;
  time: number;
  previewing: boolean;
  tool: CoachTool;
  setTool: (tool: CoachTool) => void;
  selectedId: string | null;
  select: (id: string | null) => void;
  changePiece: (piece: CoachPiece, add?: boolean) => void;
  deletePiece: () => void;
  togglePlayback: () => void;
}) {
  const [routes, setRoutes] = useState(true);
  const [zoomed, setZoomed] = useState(false);
  const [hand, setHand] = useState(false);
  const [centre, setCentre] = useState(centreOfPitch);
  const [start, setStart] = useState<CoachPiece | null>(null);
  const [gesture, setGesture] = useState<{ piece: CoachPiece; add: boolean } | null>(null);
  const drag = useRef<Drag | null>(null);
  const pitch = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const { language } = useAdminLanguage(play.locale);
  const t = (de: string, en: string) => coachText(language, de, en);
  const frame = play.frames[phase];
  const items = frame.items;
  const current = items.find((piece) => piece.id === selectedId);
  const atLimit = items.length >= 100;
  const viewWidth = PITCH_WIDTH / (zoomed ? magnification : 1);
  const viewHeight = PITCH_HEIGHT / (zoomed ? magnification : 1);
  const viewX = zoomed ? Math.max(0, Math.min(PITCH_WIDTH - viewWidth, centre.x - viewWidth / 2)) : 0;
  const viewY = zoomed ? Math.max(0, Math.min(PITCH_HEIGHT - viewHeight, centre.y - viewHeight / 2)) : 0;

  useEffect(() => {
    setStart(null);
    setGesture(null);
    drag.current = null;
  }, [tool, phase, previewing]);

  function insert(location: Point) {
    if (tool === "select" || atLimit || hand) return;
    if (isStroke(tool)) {
      if (!start) {
        setStart(newPiece(tool, location, items, play.locale));
        return;
      }
      changePiece(endArrow(start, location), true);
      setStart(null);
    } else {
      changePiece(newPiece(tool, location, items, play.locale), true);
    }
  }

  function chooseTool(next: CoachTool) {
    setHand(false);
    setTool(next);
  }

  function toggleZoom() {
    if (!zoomed) {
      const focus = current ?? centreOfPitch;
      setCentre(boundCentre(focus.x, focus.y));
    } else setHand(false);
    setZoomed(!zoomed);
  }

  function beginPan(event: PointerEvent<HTMLDivElement>) {
    drag.current = {
      type: "pan", pointer: event.pointerId, phase, centre,
      from: { x: event.clientX, y: event.clientY },
      units: viewWidth / event.currentTarget.getBoundingClientRect().width,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function nearbyPiece(location: Point, direct: CoachPiece | undefined, radius: number) {
    if (direct && !touchMarkers.has(direct.kind) && direct.kind !== "zone" && direct.kind !== "ring") return direct;
    let nearest = direct;
    let nearestDistance = direct && touchMarkers.has(direct.kind) ? distance(location, direct) : radius;
    for (const piece of items) {
      if (!touchMarkers.has(piece.kind)) continue;
      const delta = distance(location, piece);
      if (delta < nearestDistance) {
        nearestDistance = delta;
        nearest = piece;
      }
    }
    return nearest;
  }

  function begin(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !event.isPrimary || (previewing && !zoomed)) return;
    const location = getPoint(event.currentTarget, event.clientX, event.clientY);
    if (!location) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    if (zoomed && (hand || previewing)) {
      beginPan(event);
      return;
    }
    if (tool === "select") {
      const target = event.target instanceof Element ? event.target : null;
      const id = target?.closest("[data-piece-id]")?.getAttribute("data-piece-id") ?? null;
      const handle = target?.closest("[data-handle]")?.getAttribute("data-handle");
      const direct = items.find((entry) => entry.id === id);
      const radius = (event.pointerType === "touch" ? 22 : 12) * viewWidth / event.currentTarget.getBoundingClientRect().width;
      const piece = handle ? direct : nearbyPiece(location, direct, radius);
      select(piece?.id ?? null);
      if (piece) {
        drag.current = { pointer: event.pointerId, from: location, piece, phase, type: "move", ...(handle === "start" || handle === "end" ? { handle } : {}) };
        event.currentTarget.setPointerCapture(event.pointerId);
      } else if (zoomed) beginPan(event);
      return;
    }
    if (isStroke(tool) && !start && !atLimit) {
      drag.current = { pointer: event.pointerId, from: location, piece: newPiece(tool, location, items, play.locale), phase, type: "draw" };
      event.currentTarget.setPointerCapture(event.pointerId);
    } else {
      insert(location);
    }
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const active = drag.current;
    if (!active || active.pointer !== event.pointerId || active.phase !== phase) return;
    if (active.type === "pan") {
      setCentre(boundCentre(active.centre.x + (active.from.x - event.clientX) * active.units, active.centre.y + (active.from.y - event.clientY) * active.units));
      return;
    }
    const next = getPoint(event.currentTarget, event.clientX, event.clientY);
    if (next && (active.type === "move" || distance(active.from, next) >= 14)) {
      setGesture({ piece: dragPiece(active, next), add: active.type === "draw" });
    }
  }

  function end(event: PointerEvent<HTMLDivElement>) {
    const active = drag.current;
    if (!active || active.pointer !== event.pointerId || active.phase !== phase) return;
    if (active.type === "pan") { cancel(); return; }
    const next = getPoint(event.currentTarget, event.clientX, event.clientY);
    if (next && distance(active.from, next) >= (active.type === "draw" ? 14 : 2)) {
      changePiece(dragPiece(active, next), active.type === "draw");
    } else if (active.type === "draw") {
      setStart(active.piece);
    }
    cancel();
  }

  function cancel() {
    setGesture(null);
    drag.current = null;
  }

  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === " ") {
      event.preventDefault();
      togglePlayback();
      return;
    }
    if (event.key === "Escape") {
      setStart(null);
      chooseTool("select");
      select(null);
      return;
    }
    const step = event.shiftKey ? 20 : 4;
    const directions: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const direction = directions[event.key];
    if (direction && zoomed && (hand || previewing || !current)) {
      event.preventDefault();
      setCentre(boundCentre(centre.x + direction[0] * 9, centre.y + direction[1] * 9));
      return;
    }
    if (previewing) return;
    if (event.key === "Enter" && tool !== "select") {
      event.preventDefault();
      insert(zoomed ? centre : centreOfPitch);
      return;
    }
    if (!current || tool !== "select") return;
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      deletePiece();
      return;
    }
    if (direction) {
      event.preventDefault();
      changePiece(translatePiece(current, ...direction));
    }
  }

  const draw = useMemo(() => gesture ? {
    ...play,
    frames: play.frames.map((entry, index) => index !== phase ? entry : {
      ...entry, items: gesture.add ? [...entry.items, gesture.piece] : entry.items.map((piece) => piece.id === gesture.piece.id ? gesture.piece : piece),
    }),
  } : play, [gesture, phase, play]);
  const renderedPhase = previewing ? frameAt(play, time) : phase;
  const renderedSelection = previewing ? undefined : gesture?.piece.id ?? selectedId ?? undefined;
  const board = useMemo(() => renderCoachBoard(draw, 0, {
    frameIndex: renderedPhase,
    selectedId: renderedSelection,
    routes,
    variant: previewing ? "play" : "edit",
    locale: language,
  }), [draw, language, previewing, renderedPhase, renderedSelection, routes]);
  const svg = zoomed ? board.replace(/viewBox="[^"]+"/u, 'viewBox="' + [viewX, viewY, viewWidth, viewHeight].join(" ") + '"') : board;
  useLayoutEffect(() => {
    if (previewing && pitch.current) paintCoachBoard(pitch.current, play, time);
  }, [play, previewing, svg, time]);
  const hint = zoomed && (hand || previewing) ? t("Ausschnitt ziehen", "Drag to pan") : previewing ? t("Vorschau", "Preview") : tool === "select" ?
    zoomed ? t("Ziehe Elemente oder eine freie Stelle", "Drag an item or drag open space to pan") : t("Element auswählen und ziehen", "Select and drag an item") : atLimit ?
      t("100 Elemente in dieser Phase erreicht", "This phase has 100 items") : isStroke(tool) ?
        pieceLabels[tool][language] + " · " + (start ? t("Endpunkt setzen", "Set the end point") : t("Startpunkt setzen oder aufziehen", "Set the start point or drag to draw")) :
        pieceLabels[tool][language] + " · " + t("Tippe zum Platzieren", "Tap to place");

  return <>
    <div className={styles.toolbar}>
      {previewing ? <div className={styles.previewPhase}>
        <span>{t("Phase", "Phase")} {renderedPhase + 1}/{play.frames.length}</span>
        <strong lang={play.locale}>{play.frames[renderedPhase].title}</strong>
      </div> : <div className={styles.palette} role="group" aria-label={t("Werkzeuge", "Tools")}>
        <button type="button" aria-pressed={tool === "select" && !hand} onClick={() => chooseTool("select")}
          aria-label={t("Auswahl", "Select")} title={t("Auswahl", "Select")}><SelectIcon size={17} aria-hidden="true" /><span>{t("Auswahl", "Select")}</span></button>
        {simple.map((kind) => <button key={kind} type="button" data-kind={kind} aria-pressed={tool === kind && !hand}
          onClick={() => chooseTool(kind)} aria-label={pieceLabels[kind][language]} title={pieceLabels[kind][language]}>
          <PieceIcon kind={kind} size={17} /><span>{kind === "attack" ? t("Angriff", "Attack") : kind === "defence" ? t("Abwehr", "Defence") : pieceLabels[kind][language]}</span>
        </button>)}
        <ToolGroup icon={Waypoints} label={t("Pfade", "Paths")} choices={arrows} tool={tool} locale={language}
          select={(kind) => { setRoutes(true); chooseTool(kind); }} />
        <ToolGroup icon={Layers2} label={t("Objekte", "Objects")} choices={markings} tool={tool} locale={language}
          select={chooseTool} />
        <ToolGroup icon={Flag} label={t("Standards", "Set pieces")} choices={setPieces} tool={tool} locale={language}
          select={chooseTool} />
      </div>}
      {zoomed && !previewing && <IconButton icon={Hand} label={t("Ausschnitt verschieben", "Pan the pitch")} className={styles.routeToggle}
        aria-pressed={hand} onClick={() => { setStart(null); setHand(!hand); }} />}
      <IconButton icon={zoomed ? ZoomOut : ZoomIn} label={zoomed ? t("Ganzes Spielfeld einpassen", "Fit the pitch") : t("Spielfeld vergrößern", "Zoom into the pitch")}
        className={styles.routeToggle} aria-pressed={zoomed} onClick={toggleZoom} />
      <IconButton icon={Route} label={t("Laufwege und Pfeile anzeigen", "Show routes and arrows")} className={styles.routeToggle}
        aria-pressed={routes} onClick={() => setRoutes(!routes)} />
    </div>
    <div className={styles.boardInset} data-preview={previewing || undefined}>
      <div className={styles.stage}>
        <CoachPitch ref={pitch} className={styles.editPitch} svg={svg} data-tool={zoomed && (hand || previewing) ? "pan" : previewing ? "preview" : tool}
          data-zoomed={zoomed || undefined}
          tabIndex={0} role="group" aria-label={t("Rugby-Taktiktafel", "Rugby tactics board")} aria-describedby={hintId}
          onPointerDown={begin} onPointerMove={move} onPointerUp={end} onLostPointerCapture={cancel}
          onPointerCancel={cancel} onKeyDown={keyboard} />
        {start && !previewing && !hand && <span className={styles.pathStart} aria-hidden="true"
          style={{ left: (start.x - viewX) / viewWidth * 100 + "%", top: (start.y - viewY) / viewHeight * 100 + "%" }} />}
      </div>
      <div className={styles.boardHint}>
        <span id={hintId}>{hint}</span>
        {!previewing && tool !== "select" && !atLimit && !hand && <button type="button" onClick={() => insert(zoomed ? centre : centreOfPitch)}>
          {t("Mittig platzieren", "Place at centre")}
        </button>}
      </div>
    </div>
  </>;
}

function ToolGroup({ icon: Icon, label, choices, tool, locale, select }: {
  icon: typeof Route;
  label: string;
  choices: readonly CoachKind[];
  tool: CoachTool;
  locale: CoachLocale;
  select: (kind: CoachKind) => void;
}) {
  const active = choices.find((kind) => kind === tool);
  return <details className={styles.toolGroup} data-active={Boolean(active)}
    onBlur={(event) => { if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }}
    onKeyDown={(event) => {
      if (event.key === "Escape" && event.currentTarget.open) {
        event.stopPropagation();
        event.currentTarget.open = false;
        event.currentTarget.querySelector("summary")?.focus();
      }
    }}>
    <summary title={active ? pieceLabels[active][locale] : label} aria-label={active ? label + " · " + pieceLabels[active][locale] : label}>
      {active ? <PieceIcon kind={active} size={17} /> : <Icon size={17} aria-hidden="true" />}
      <span>{active ? pieceLabels[active][locale] : label}</span>
      <ChevronDown size={12} aria-hidden="true" />
    </summary>
    <div className={styles.menuSheet}>
      {choices.map((kind) => <button key={kind} type="button" aria-pressed={kind === tool} onClick={(event) => {
        const menu = event.currentTarget.closest("details");
        if (menu) menu.open = false;
        menu?.querySelector("summary")?.focus();
        select(kind);
      }}><PieceIcon kind={kind} size={16} /> {pieceLabels[kind][locale]}</button>)}
    </div>
  </details>;
}
