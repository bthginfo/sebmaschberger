import type { ContentItem } from "./types";

export function scroll3dStops(items: readonly ContentItem[]): number[] | undefined {
  const points = [0, ...items.map(item => item.scroll3d?.start), 100];
  let previous = 0;
  for (let index = 1; index < points.length; index++) {
    const point = points[index];
    if (point === undefined) continue;
    if (point <= points[previous]!) return;
    for (let gap = previous + 1; gap < index; gap++) {
      points[gap] = points[previous]! + (point - points[previous]!) * (gap - previous) / (index - previous);
    }
    previous = index;
  }
  return (points.slice(0, -1) as number[]).map(point => point / 100);
}
