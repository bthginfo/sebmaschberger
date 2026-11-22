import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const schemes = {
  cms: { from: '#293d61', to: '#101d33', ink: '#e4eeff', accent: '#9bbcfa',
    mark: '<rect x="161" y="161" width="84" height="84" rx="19"/><rect x="267" y="161" width="84" height="84" rx="19" fill="var(--accent)" /><rect x="161" y="267" width="84" height="84" rx="19"/><rect x="267" y="267" width="84" height="84" rx="19"/>' },
  member: { from: '#224a3e', to: '#0c241d', ink: '#eef6e9', accent: '#d8f871',
    mark: '<path d="M256 142c30 22 56 28 96 31v70c0 69-38 110-96 137-58-27-96-68-96-137v-70c40-3 66-9 96-31z" fill="none" stroke="currentColor" stroke-width="17" stroke-linejoin="round"/><circle cx="256" cy="227" r="27" fill="var(--accent)"/><path d="M210 300c7-28 24-44 46-44s39 16 46 44c-29 12-63 12-92 0z"/>' },
};

await mkdir('public/workspace-app', { recursive: true });
await sharp('public/icon.svg').resize(32, 32).png().toFile('public/workspace-app/favicon-32.png');
await Promise.all(Object.entries(schemes).flatMap(([scope, { from, to, ink, accent, mark }]) =>
  ['180', '192', '512', 'maskable'].map(async size => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><defs><linearGradient id="surface" x2="1" y2="1"><stop stop-color="' + from + '"/><stop offset="1" stop-color="' + to + '"/></linearGradient></defs><path fill="url(#surface)" d="M0 0h512v512H0z"/><circle cx="256" cy="256" r="157" fill="#fff" opacity=".065"/><g fill="' + ink + '" style="color:' + ink + '">' + mark.replaceAll('var(--accent)', accent) + '</g></svg>';
    await sharp(Buffer.from(svg)).resize(size === 'maskable' ? 512 : Number(size)).png().toFile('public/workspace-app/' + scope + '-' + size + '.png');
  })
));
