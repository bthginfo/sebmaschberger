export const CLUB_HOME_BLOCKS = ['training', 'news', 'fixtures', 'tactics', 'teams'] as const;
export const CLUB_THEMES = ['pitch', 'coast', 'dusk', 'sand'] as const;
export const CLUB_LAYOUTS = ['balanced', 'focus', 'stack'] as const;
export type ClubHomeBlock = (typeof CLUB_HOME_BLOCKS)[number];
export type ClubTheme = (typeof CLUB_THEMES)[number];
export type ClubLayout = (typeof CLUB_LAYOUTS)[number];

export type ClubAppearanceInput = {
  revision: number;
  theme: ClubTheme;
  layout: ClubLayout;
  imageMode: 'default' | 'none' | 'upload';
  home: { id: ClubHomeBlock; enabled: boolean }[];
  copy: Record<'de' | 'en', { title: string; subtitle: string }>;
};

export type ClubAppearance = ClubAppearanceInput & { imageVersion?: string };

export const DEFAULT_CLUB_APPEARANCE: ClubAppearance = {
  revision: 1,
  theme: 'pitch',
  layout: 'balanced',
  imageMode: 'default',
  home: CLUB_HOME_BLOCKS.map(id => ({ id, enabled: id !== 'teams' })),
  copy: { de: { title: '', subtitle: '' }, en: { title: '', subtitle: '' } },
};
