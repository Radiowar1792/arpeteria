// Doit rester cohérent avec `site` dans astro.config.mjs (les deux lisent SITE_URL,
// avec le même repli sur arpeteria.fr en prod normale).
const SITE_URL = import.meta.env.SITE_URL ?? 'https://arpeteria.fr';

export function canonicalUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
