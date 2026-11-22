export function GET() {
  return Response.json({
    id: '/portal', name: 'Sebastian Coaching', short_name: 'Coaching', start_url: '/portal', scope: '/portal',
    display: 'standalone', background_color: '#13110f', theme_color: '#13110f',
    icons: [192,512].map(size => ({
      src: '/workspace-app/cms-' + size + '.png', sizes: size + 'x' + size, type: 'image/png', purpose: 'any'
    })),
  }, { headers: { 'Content-Type': 'application/manifest+json' } });
}
