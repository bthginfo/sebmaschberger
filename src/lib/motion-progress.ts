/** Follow native input with a bounded speed, even after a large wheel or touch delta. */
export function advanceMotionProgress(current: number, target: number, seconds: number, speed = 1.55, response = 8): number {
  const dt = Math.max(0, Math.min(seconds, 1 / 24));
  const gap = target - current;
  const cap = speed * dt;
  if (Math.abs(gap) < .0004 && Math.abs(gap) <= cap) return target;
  return current + Math.max(-cap, Math.min(cap, gap * -Math.expm1(-response * dt)));
}
