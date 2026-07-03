import type { APIRoute } from 'astro';

// Point vers le vrai domaine de déploiement (SITE_URL), pas un domaine figé — voir
// lib/seo.ts et astro.config.mjs qui lisent la même variable.
const SITE_URL = import.meta.env.SITE_URL ?? 'https://arpeteria.fr';

export const GET: APIRoute = () => {
  const corps = `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap-index.xml', SITE_URL).toString()}\n`;
  return new Response(corps, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
