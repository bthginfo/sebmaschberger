/* A network-only worker. Never retain private HTML, inbox data or profile photos. */
const scope = new URL(self.registration.scope).pathname;
const cms = scope.startsWith('/admin');
const root = cms ? '/admin' : '/members';
const icons = '/workspace-branding/' + (cms ? 'cms' : 'member') + '-192.png';

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

function inScope(pathname) {
  return pathname === root || pathname.startsWith(root + '/');
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || request.mode !== 'navigate' || url.origin !== self.location.origin || !inScope(url.pathname)) return;
  event.respondWith(fetch(request).catch(() => {
    const de = self.navigator.language?.startsWith('de');
    const title = de ? 'Keine Verbindung' : 'You’re offline';
    const detail = de ? 'Für diesen privaten Bereich brauchst du eine Internetverbindung.' : 'This private workspace needs an internet connection.';
    return new Response('<!doctype html><html lang="' + (de ? 'de' : 'en') + '"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + title + '</title><style>body{font:17px system-ui;color:#122333;background:#f3f5f7;display:grid;min-height:95vh;place-items:center;margin:0}main{max-width:25rem;margin:1rem;padding:2rem;border-radius:1.25rem;background:white}a{color:#285f85}</style><main><h1>' + title + '</h1><p>' + detail + '</p><a href="' + root + '">' + (de ? 'Erneut versuchen' : 'Try again') + '</a></main></html>', {
      status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'" },
    });
  }));
});

function safePath(value) {
  try {
    const url = new URL(typeof value === 'string' ? value : root, self.location.origin);
    return url.origin === self.location.origin && inScope(url.pathname) ? url.href : self.location.origin + root;
  } catch {
    return self.location.origin + root;
  }
}

self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data?.json() ?? {}; } catch { /* Default to an update without any private text. */ }
  const url = safePath(payload.path);
  const title = typeof payload.title === 'string' ? payload.title.slice(0, 100) : (cms ? 'CMS' : 'Member area');
  const body = typeof payload.body === 'string' ? payload.body.slice(0, 150) : 'Open the app to see the update.';
  const tag = typeof payload.tag === 'string' ? payload.tag.slice(0, 120) : undefined;
  event.waitUntil(self.registration.showNotification(title, { body, tag, icon: icons, badge: icons, data: { url } }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const destination = safePath(event.notification.data?.url);
  event.waitUntil((async () => {
    const existing = (await self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .find(client => inScope(new URL(client.url).pathname));
    if (existing) {
      try { await existing.navigate(destination); return await existing.focus(); } catch { /* Open the destination as a new window. */ }
    }
    return self.clients.openWindow(destination);
  })());
});
