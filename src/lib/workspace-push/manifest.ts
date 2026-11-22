import { workspaceAppPath, type WorkspaceAppScope } from './model';
import { brandIconPath, brandIconVersion } from './branding';

export function workspaceManifest(scope: WorkspaceAppScope, brandName: string, language: 'de' | 'en' = 'en', version?: string) {
  const path = workspaceAppPath(scope);
  const area = scope === 'cms' ? 'CMS' : language === 'de' ? 'Mitglieder' : 'Members';
  const prefix = '/workspace-app/' + scope + '-';
  const color = scope === 'cms' ? '#172a43' : '#112d25';
  return {
    id: path, name: brandName + ' · ' + area,
    short_name: scope === 'cms' ? 'CMS' : area,
    start_url: path + '?source=app', scope: path, display: 'standalone', orientation: 'any',
    lang: language, theme_color: color, background_color: '#f3f4ef',
    icons: [
      { src: version ? brandIconPath(scope, '192', version) : prefix + '192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: version ? brandIconPath(scope, '512', version) : prefix + '512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: version ? brandIconPath(scope, 'maskable', version) : prefix + 'maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

export async function manifestResponse(scope: WorkspaceAppScope, brandName: string, language: 'de' | 'en') {
  return new Response(JSON.stringify(workspaceManifest(scope, brandName, language, await brandIconVersion(scope))), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
}
