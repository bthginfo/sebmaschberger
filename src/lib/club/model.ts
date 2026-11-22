import type { ClubAppearance } from './appearance-model';

export const CLUB_ROLES = ["member", "coach", "board", "admin"] as const;
export type ClubRole = (typeof CLUB_ROLES)[number];
export type ClubStatus = "invited" | "active" | "disabled";
export type ClubRsvp = "yes" | "no" | "maybe";
export type ClubPlayAccess = "view" | "edit";

export interface ClubActor {
  id: string;
  name: string;
  role: ClubRole;
  owner: boolean;
  teamIds: string[];
}

export interface ClubPerson {
  id: string;
  revision: number;
  name: string;
  email?: string;
  role: ClubRole;
  status: ClubStatus;
  teamIds: string[];
  position: string;
  jersey: number | null;
  bio: string;
  avatar: boolean;
}

export interface ClubTeam {
  id: string;
  revision: number;
  name: string;
  shortName: string;
  description: string;
  color: string;
  managerIds: string[];
  category?: string;
  competition?: string;
  season?: string;
  homeVenue?: string;
  archived?: boolean;
}

export interface ClubTraining {
  id: string;
  revision: number;
  teamId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  details: string;
  equipment: string;
  response?: ClubRsvp | null;
  attendance?: { personId: string; response: ClubRsvp }[];
}

export interface ClubMatch {
  id: string;
  revision: number;
  teamId: string;
  opponent: string;
  startsAt: string;
  venue: string;
  home: boolean;
  status: "scheduled" | "final" | "cancelled";
  ourScore: number | null;
  theirScore: number | null;
  public: boolean;
  notes: string;
}

export interface ClubNews {
  id: string;
  revision: number;
  teamId: string | null;
  title: string;
  body: string;
  titleEn: string;
  bodyEn: string;
  pinned: boolean;
  published: boolean;
  updatedAt: string;
}

export interface ClubAssignment {
  id: string;
  revision: number;
  playId: string;
  targetType: "team" | "person";
  targetId: string;
  access: ClubPlayAccess;
  instructions: string;
  updatedAt: string;
}

export interface ClubPlayItem {
  id: string;
  title: string;
  description: string;
  phaseCount: number;
  access: ClubPlayAccess;
  href: string;
  canAssign: boolean;
  copy?: Record<'de' | 'en', { title: string; description: string }>;
}

export interface ClubInvite {
  id: string;
  name: string;
  email: string;
  role: ClubRole;
  expiresAt: string;
}

export interface ClubWorkspace {
  brandName: string;
  actor: ClubActor;
  people: ClubPerson[];
  teams: ClubTeam[];
  trainings: ClubTraining[];
  matches: ClubMatch[];
  news: ClubNews[];
  assignments: ClubAssignment[];
  plays: ClubPlayItem[];
  invites: ClubInvite[];
  mailAvailable: boolean;
  appearance: ClubAppearance;
  capabilities: { manage: boolean; invite: boolean; assign: boolean; news: boolean; design: boolean; coachStudio: boolean };
}
