import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // Doit rester cohérent avec SITE_URL utilisé dans lib/seo.ts (canonicalUrl) — les deux
  // lisent la même variable d'environnement, avec le même repli sur arpeteria.fr en prod normale.
  site: process.env.SITE_URL ?? 'https://arpeteria.fr',
  integrations: [sitemap()],
});
