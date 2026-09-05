export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });

export const error = (message, status = 400, extra = {}) => json({ error: message, ...extra }, status);

export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Reduce a submitted website to a clean https origin + bare domain.
export function normaliseWebsite(raw) {
  const text = String(raw || '').trim();
  if (!text || text.length > 240) return null;
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  if (!['https:', 'http:'].includes(url.protocol)) return null;
  const host = url.hostname.toLowerCase();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host) || host === 'localhost') return null;
  return { website: url.origin, domain: host.replace(/^www\./, '') };
}

export const validDomain = (d) => /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(d);
