import type { Point, Quad, Rect, PhotoView } from './photo-motion';

/** Place an extracted object about the point that makes contact with its world. */
export function layer(rect: Rect, pivot: Point, position: Point, scale: number, tilt = 0, height = 1): Quad {
  const [x, y, w, h] = rect;
  const cos = Math.cos(tilt), sin = Math.sin(tilt);
  function point(px: number, py: number): Point {
    const dx = (px - pivot[0]) * scale, dy = (py - pivot[1]) * scale * height;
    return [position[0] + dx * cos - dy * sin, position[1] + dx * sin + dy * cos];
  }
  return [point(x, y), point(x + w, y), point(x + w, y + h), point(x, y + h)];
}

/** How close the camera must be for a photographed display to fill its real viewport. */
export function fillDisplay(view: PhotoView, width: number, height: number) {
  const base = Math.max(view.width / 1536, view.height / 1024);
  return Math.max(view.width / width, view.height / height) / base;
}
