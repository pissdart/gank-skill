import { validDomain } from '../_lib/util.js';

// GET /api/logo?domain=example.com — same-origin favicon proxy so the 3D
// tattoo textures can be drawn to a canvas without CORS trouble.
export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const domain = (url.searchParams.get('domain') || '').trim().toLowerCase();
  if (!validDomain(domain)) return new Response('Bad domain', { status: 400 });

  const cache = caches.default;
  const cacheKey = new Request(`${url.origin}/api/logo?domain=${encodeURIComponent(domain)}`);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const sources = [
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  ];
  for (const src of sources) {
    try {
      const res = await fetch(src, { redirect: 'follow', cf: { cacheTtl: 86400 } });
      const type = res.headers.get('content-type') || '';
      if (!res.ok || !type.startsWith('image/')) continue;
      const bytes = await res.arrayBuffer();
      if (bytes.byteLength < 100) continue;
      const out = new Response(bytes, {
        headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400, s-maxage=604800', 'X-Content-Type-Options': 'nosniff' },
      });
      await cache.put(cacheKey, out.clone());
      return out;
    } catch {
      /* try the next source */
    }
  }
  return new Response('No logo', { status: 404, headers: { 'Cache-Control': 'public, max-age=3600' } });
}
