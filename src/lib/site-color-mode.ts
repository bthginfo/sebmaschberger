export const colorModeStorageKey = "seb-color-mode";
export const themeColors = { dark: "#121210", light: "#f8f5ee" } as const;
export type SiteColorMode = keyof typeof themeColors;

// Run before the site paints, including on a direct visit to a translated URL.
export const colorModeBootstrap = `try {
  if (localStorage.getItem(${JSON.stringify(colorModeStorageKey)}) === "light") {
    document.documentElement.dataset.sebMode = "light";
    document.querySelectorAll('meta[name="theme-color"]').forEach(meta => meta.setAttribute("content", ${JSON.stringify(themeColors.light)}));
  }
} catch {}`;
