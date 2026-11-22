import { get } from '@vercel/blob';
import { getSession } from '@/lib/auth';
import { getPublished } from '@/lib/db';

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (process.env.WS_BLOB_SQLITE !== '1' || !/^[a-f0-9-]{36}\.webp$/.test(file)) return new Response(null, { status: 404 });

  const url = '/api/editor-media/' + file;
  if (!(await getSession())) {
    const content = await getPublished();
    const needle = JSON.stringify(url);
    const visible = content.pages.some(page => page.sections.some(section => section.visible && JSON.stringify(section.content).includes(needle)))
      || content.config.modules?.commerce?.products.some(product => product.active && product.image?.src === url)
      || content.config.blog?.enabled && content.posts?.some(post => post.status === 'published' && (post.cover?.src === url || post.sections.some(section => section.visible && JSON.stringify(section.content).includes(needle))));
    if (!visible) return new Response(null, { status: 404 });
  }

  const blob = await get('editor-media/' + file, { access: 'private', useCache: false });
  if (!blob || blob.statusCode !== 200) return new Response(null, { status: 404 });
  return new Response(blob.stream, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
