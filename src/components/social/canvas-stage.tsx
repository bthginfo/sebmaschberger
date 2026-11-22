"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {socialSafeArea} from '@/lib/social/safe-area';
import { clone, selectionBounds, snapDelta } from "@/lib/social/editing";
import { formatOf, type SocialElement, type SocialProject } from "@/lib/social/model";
import { prepareProject, type RenderResources } from "@/lib/social/render";

import {createStudioFramePainter} from "@/lib/social/frame-painter";
import { useAdminLanguage } from "@/components/admin/admin-language";

type Point = { x: number; y: number };
type Mode = "drag" | "rotate" | "nw" | "ne" | "sw" | "se";
type Gesture = { pointerId: number; mode: Mode; start: Point; elements: SocialElement[]; bounds: NonNullable<ReturnType<typeof selectionBounds>>; center: Point; angle: number };
type Props = { project: SocialProject; index: number; selectedIds: string[]; playing: boolean; timeMs: number; safeGuides: boolean; snapping: boolean; disabled?: boolean; onSelect: (ids: string[]) => void; onStart: () => void; onTransform: (elements: SocialElement[]) => void; onCommit: () => void };

export function CanvasStage({ project, index, selectedIds, playing, timeMs, safeGuides, snapping, disabled, onSelect, onStart, onTransform, onCommit }: Props) {
  const { t } = useAdminLanguage();
  const canvas = useRef<HTMLCanvasElement>(null), frame = useRef<HTMLDivElement>(null), gesture = useRef<Gesture | null>(null), resources = useRef<RenderResources | null>(null);
  const [resourceVersion, setResourceVersion] = useState(0), [error, setError] = useState("");
  const [guides, setGuides] = useState<{ axis: "x" | "y"; value: number }[]>([]);
  const format = formatOf(project), slide = project.slides[index] || project.slides[0];
  const selected = slide.elements.filter(element => selectedIds.includes(element.id) && !element.hidden);
  const bounds = selectionBounds(selected),safeArea=socialSafeArea(format);
  const resourceKey = JSON.stringify([project.brand, project.slides.map(item => item.elements.filter(element => element.type === "image" || element.type === "text").map(element => [element.src, element.fontId, element.fontWeight]))]);
  useEffect(() => {
    let active = true;
    setError("");
    void prepareProject(project).then(value => { if (active) { resources.current = value; setResourceVersion(version => version + 1); } }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Bild oder Schrift konnte nicht geladen werden."); });
    return () => { active = false; };
    // Only reload bitmap/font resources when their identity changes, never on pointer movement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceKey]);
  const painter=useRef<ReturnType<typeof createStudioFramePainter>|null>(null);
  useEffect(()=>{const instance=createStudioFramePainter();painter.current=instance;return()=>{painter.current=null;instance.dispose();};},[]);
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context || !resources.current) return;
    const loaded=resources.current;
    painter.current?.paint({ctx:context,project,index,timeMs,playing,resources:loaded,ready:()=>resources.current===loaded,error:reason=>setError(reason instanceof Error?reason.message:"Video-Vorschau nicht verfügbar")});
  }, [project,index,playing,timeMs,resourceVersion]);
  function point(event: ReactPointerEvent): Point {
    const rect = frame.current!.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * format.width / rect.width, y: (event.clientY - rect.top) * format.height / rect.height };
  }
  function hit(element: SocialElement, p: Point) {
    const cx = element.x + element.width / 2, cy = element.y + element.height / 2, angle = -element.rotation * Math.PI / 180;
    const x = Math.cos(angle) * (p.x - cx) - Math.sin(angle) * (p.y - cy) + cx, y = Math.sin(angle) * (p.x - cx) + Math.cos(angle) * (p.y - cy) + cy;
    return x >= element.x && x <= element.x + element.width && y >= element.y && y <= element.y + element.height;
  }
  function begin(event: ReactPointerEvent, mode: Mode = "drag") {
    if (playing || disabled || event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    const p = point(event);
    let items = selected.filter(element => !element.locked);
    if (mode === "drag") {
      const target = [...slide.elements].reverse().find(element => !element.hidden && !element.locked && hit(element, p));
      if (!target) { onSelect([]); return; }
      const toggle = event.shiftKey || event.ctrlKey || event.metaKey;
      let ids = toggle ? selectedIds.includes(target.id) ? selectedIds.filter(id => id !== target.id) : [...selectedIds, target.id] : selectedIds.includes(target.id) ? selectedIds : [target.id];
      if (target.groupId && !toggle) ids = slide.elements.filter(element => element.groupId === target.groupId).map(element => element.id);
      onSelect(ids); items = slide.elements.filter(element => ids.includes(element.id) && !element.locked && !element.hidden);
    }
    const box = selectionBounds(items); if (!box) return;
    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    gesture.current = { pointerId: event.pointerId, mode, start: p, elements: clone(items), bounds: box, center, angle: Math.atan2(p.y - center.y, p.x - center.x) };
    frame.current?.setPointerCapture(event.pointerId); onStart();
  }
  function move(event: ReactPointerEvent) {
    const current = gesture.current; if (!current || current.pointerId !== event.pointerId) return;
    const p = point(event), dx = p.x - current.start.x, dy = p.y - current.start.y;
    let next = clone(current.elements);
    if (current.mode === "drag") {
      let x = event.shiftKey && Math.abs(dy) > Math.abs(dx) ? 0 : dx, y = event.shiftKey && Math.abs(dx) >= Math.abs(dy) ? 0 : dy;
      if (snapping && !event.altKey) { const snap = snapDelta(current.elements, slide.elements.filter(element => !selectedIds.includes(element.id) && !element.hidden), format.width, format.height, x, y, 8 * format.width / (frame.current?.clientWidth || format.width)); x = snap.dx; y = snap.dy; setGuides(snap.guides); } else setGuides([]);
      next = next.map(element => ({ ...element, x: Math.max(-10000, Math.min(10000, element.x + x)), y: Math.max(-10000, Math.min(10000, element.y + y)) }));
    } else if (current.mode === "rotate") {
      let angle = (Math.atan2(p.y - current.center.y, p.x - current.center.x) - current.angle) * 180 / Math.PI;
      if (event.shiftKey) angle = Math.round(angle / 15) * 15;
      const radians = angle * Math.PI / 180;
      next = next.map(element => { const cx = element.x + element.width / 2 - current.center.x, cy = element.y + element.height / 2 - current.center.y; return { ...element, rotation: (element.rotation + angle) % 360, x: current.center.x + cx * Math.cos(radians) - cy * Math.sin(radians) - element.width / 2, y: current.center.y + cx * Math.sin(radians) + cy * Math.cos(radians) - element.height / 2 }; });
    } else {
      const box = current.bounds, west = current.mode.includes("w"), north = current.mode.includes("n");
      let width = Math.max(20, box.width + (west ? -dx : dx)), height = Math.max(20, box.height + (north ? -dy : dy));
      if (event.shiftKey) { const scale = Math.max(width / box.width, height / box.height); width = box.width * scale; height = box.height * scale; }
      width = Math.min(10000, width); height = Math.min(10000, height);
      const x = west ? box.x + box.width - width : box.x, y = north ? box.y + box.height - height : box.y, sx = width / box.width, sy = height / box.height;
      next = next.map(element => ({ ...element, x: x + (element.x - box.x) * sx, y: y + (element.y - box.y) * sy, width: Math.min(10000, Math.max(1, element.width * sx)), height: Math.min(10000, Math.max(1, element.height * sy)), ...(element.fontSize ? { fontSize: Math.max(6, Math.min(600, element.fontSize * Math.min(sx, sy))) } : {}) }));
    }
    onTransform(next);
  }
  function end(event: ReactPointerEvent) { if (!gesture.current || gesture.current.pointerId !== event.pointerId) return; gesture.current = null; setGuides([]); if (frame.current?.hasPointerCapture(event.pointerId)) frame.current.releasePointerCapture(event.pointerId); onCommit(); }
  const handle = Math.max(18, format.width / 42), radius = handle / 2;
  return <div ref={frame} className={`social-stage ${playing ? "social-stage--playing" : ""}`} style={{ aspectRatio: `${format.width}/${format.height}` }} role="group" aria-label={t("Design-Zeichenfläche. Objekte können auch über Ebenen und numerische Eigenschaften bearbeitet werden.")} onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
    <canvas ref={canvas} width={format.width} height={format.height} aria-hidden="true" />
    {!playing && <svg className="social-selection" viewBox={`0 0 ${format.width} ${format.height}`} aria-hidden="true">
      {safeGuides && <rect className="social-safe-guide" x={safeArea.x} y={safeArea.y} width={safeArea.width} height={safeArea.height}><title>{safeArea.vertical?t("Freiraum für Caption und Video-Controls · Richtwert"):t("Sicherheitsabstand")}</title></rect>}
      {guides.map((guide, i) => <line key={i} className="social-snap-line" x1={guide.axis === "x" ? guide.value : 0} y1={guide.axis === "y" ? guide.value : 0} x2={guide.axis === "x" ? guide.value : format.width} y2={guide.axis === "y" ? guide.value : format.height} />)}
      {selected.map(element => <rect key={element.id} className="social-object-outline" x={element.x} y={element.y} width={element.width} height={element.height} transform={`rotate(${element.rotation} ${element.x + element.width / 2} ${element.y + element.height / 2})`} />)}
      {bounds && selected.some(element => !element.locked) && <g><rect className="social-bounds" x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} />{(["nw", "ne", "sw", "se"] as const).map(mode => <rect key={mode} className={`social-resize-handle social-resize-handle--${mode}`} x={bounds.x + (mode.includes("e") ? bounds.width : 0) - radius} y={bounds.y + (mode.includes("s") ? bounds.height : 0) - radius} width={handle} height={handle} rx={handle / 6} onPointerDown={event => begin(event, mode)} />)}<line className="social-bounds" x1={bounds.x + bounds.width / 2} y1={bounds.y} x2={bounds.x + bounds.width / 2} y2={bounds.y - handle * 2} /><circle className="social-rotate-handle" cx={bounds.x + bounds.width / 2} cy={bounds.y - handle * 2} r={radius} onPointerDown={event => begin(event, "rotate")} /></g>}
    </svg>}
    {error && <p className="social-stage-error" role="alert">{error}{" " + t("Wählen Sie das Medium erneut aus Ihrer Mediathek.")}</p>}
  </div>;
}
