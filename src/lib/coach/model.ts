export const PITCH_WIDTH = 1000;
export const PITCH_HEIGHT = 620;

export const COACH_PITCHES = ['full', 'half', '22', 'whiteboard'] as const;
export const COACH_CATEGORIES = ['attack', 'defence', 'set-piece', 'drill'] as const;
export const COACH_KINDS = [
  'attack', 'defence', 'ball', 'cone', 'zone', 'label', 'run', 'pass', 'kick', 'ruck', 'scrum', 'lineout',
  'ring', 'line', 'gate', 'pad', 'flag',
] as const;
export const COACH_TONES = ['sky', 'coral', 'mint', 'amber', 'violet', 'white'] as const;
export const COACH_TRANSITIONS = ['smooth', 'linear', 'quick'] as const;
export const COACH_BALL_FLIGHTS = ['auto', 'ground', 'pass', 'kick'] as const;

export type CoachLocale = 'de' | 'en';
export type CoachPitch = typeof COACH_PITCHES[number];
export type CoachCategory = typeof COACH_CATEGORIES[number];
export type CoachKind = typeof COACH_KINDS[number];
export type CoachTone = typeof COACH_TONES[number];
export type CoachTransition = typeof COACH_TRANSITIONS[number];
export type CoachBallFlight = typeof COACH_BALL_FLIGHTS[number];

export interface CoachPiece {
  id: string;
  kind: CoachKind;
  x: number;
  y: number;
  label: string;
  x2?: number;
  y2?: number;
  width?: number;
  height?: number;
  curve?: number;
  angle?: number;
  tone?: CoachTone;
}

export interface CoachFrame {
  id: string;
  title: string;
  notes: string;
  seconds: number;
  hold?: number;
  transition?: CoachTransition;
  ballFlight?: CoachBallFlight;
  items: CoachPiece[];
}

export interface CoachPlan {
  objective?: string;
  players?: string;
  area?: string;
  equipment?: string;
  progression?: string;
  minutes?: number;
}

export interface CoachPlay {
  title: string;
  description: string;
  category: CoachCategory;
  pitch: CoachPitch;
  locale: CoachLocale;
  frames: CoachFrame[];
  plan?: CoachPlan;
}

export interface CoachRecord {
  id: string;
  revision: number;
  updatedAt: string;
  play: CoachPlay;
}

export interface CoachLink {
  id: string;
  role: 'view' | 'edit';
  name: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
}

export function makeCoachPlay(locale: CoachLocale = 'de'): CoachPlay {
  return {
    title: locale === 'de' ? 'Neue Taktik' : 'New play',
    description: '',
    category: 'drill',
    pitch: 'full',
    locale,
    frames: [{ id: 'setup', title: locale === 'de' ? 'Aufstellung' : 'Set-up', notes: '', seconds: 2, items: [] }],
  };
}

/** The clock starts each phase with its hold, followed by its movement. */
export function frameTimes(play: CoachPlay): number[] {
  let time = 0;
  return play.frames.map(frame => {
    const start = time;
    time += (frame.hold ?? 0) + frame.seconds;
    return start;
  });
}

export function playDuration(play: CoachPlay): number {
  return (frameTimes(play).at(-1) ?? 0) + (play.frames.at(-1)?.hold ?? 0);
}

export function frameAt(play: CoachPlay, time: number): number {
  return Math.max(0, frameTimes(play).findLastIndex(start => start <= time));
}

export function movesBetweenPhases(kind: CoachKind): boolean {
  return kind === 'attack' || kind === 'defence' || kind === 'ball' || kind === 'cone'
    || kind === 'gate' || kind === 'pad' || kind === 'flag';
}
