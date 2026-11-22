/** @type {import('./types').LiquidGlassSettings} */
export const defaultLiquidGlass = {
  enabled: true, background: 'aurora', intensity: 40, speed: 40, depth: 45,
  reveal: true, feedback: true, revealDuration: 800,
};

/** @type {import('./types').ColorPalette} */
export const liquidGlassPalette = {
  primary: '#eff3ff', accent: '#bacbff', background: '#070c19',
  text: '#eff3ff', surface: '#172239', border: '#3c4962',
};

/** @param {Partial<import('./types').LiquidGlassSettings>} [settings] */
export function liquidGlassSettings(settings) { return { ...defaultLiquidGlass, ...settings }; }

/** Explicit selection creates a local draft; it never publishes or changes another project.
 * @param {import('./types').SiteConfig} config
 * @param {Partial<Record<'primary'|'accent'|'background',string>>} [colors]
 * @returns {import('./types').SiteConfig}
 */
export function applyLiquidGlass(config, colors = {}) {
  const palette = { ...liquidGlassPalette, ...colors, ...(colors.primary ? { text: colors.primary } : {}) };
  return {
    ...config, designVariant: 1,
    theme: { ...config.theme, aesthetic: 'liquid-glass', glass: liquidGlassSettings(config.theme.glass),
      primary: palette.primary, accent: palette.accent, background: palette.background,
      radius: 28, font: 'manrope', palettes: { ...config.theme.palettes, 1: palette } },
  };
}
