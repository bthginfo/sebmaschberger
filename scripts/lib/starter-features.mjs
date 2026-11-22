export const scaffoldFeatureModules = Object.freeze({
  'social-studio': 'socialStudio',
  'ai-assistant': 'aiAssistant',
  'social-publishing': 'socialPublishing',
  'coach-studio': 'coachStudio',
  'club-management': 'clubManagement',
  'scroll-3d': 'scroll3d',
  'restaurant-menu': 'restaurantMenu',
  reservations: 'reservations',
  consultations: 'consultations',
});

export function parseFeatures(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('--features benötigt eine Liste von Funktionsnamen.');
  const features = [...new Set(value.split(',').map(entry => entry.trim()))];
  for (const feature of features) if (!Object.hasOwn(scaffoldFeatureModules, feature)) {
    throw new Error(`Unbekannte Funktion: ${feature || '(leer)'}. Verfügbar: ${Object.keys(scaffoldFeatureModules).join(', ')}.`);
  }
  return features;
}
