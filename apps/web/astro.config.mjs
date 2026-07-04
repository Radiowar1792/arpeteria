import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // Doit rester cohérent avec SITE_URL utilisé dans lib/seo.ts (canonicalUrl) — les deux
  // lisent la même variable d'environnement, avec le même repli sur arpeteria.fr en prod normale.
  site: process.env.SITE_URL ?? 'https://arpeteria.fr',
  integrations: [sitemap()],
  // Précharge une page dès que la souris survole un lien interne : navigation quasi
  // instantanée. `prefetchAll` étend ça à tous les liens sans avoir à les annoter un par un.
  prefetch: {
    defaultStrategy: 'hover',
    prefetchAll: true,
  },
});
