import type { ClubRole } from './model';

export type ClubAudience = { kind: 'person' | 'team'; id: string } | { kind: 'role'; role: ClubRole } | { kind: 'club' };
export type ClubMessage = {
  id: string;
  senderId: string;
  senderName: string;
  audienceLabel: string;
  subject: string;
  body: string;
  createdAt: string;
  read: boolean;
  sent: boolean;
  replyTo?: string;
  replyToPerson?: { id: string; name: string };
  recipientCount?: number;
};
export type ClubMessageChoices = {
  people: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  roles: ClubRole[];
  club: boolean;
};
export type ClubMessagePage = { messages: ClubMessage[]; choices: ClubMessageChoices; nextBefore?: string };
