import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getOeuvres } from '../lib/directus.ts';
import { canonicalUrl } from '../lib/seo.ts';

export const GET: APIRoute = async () => {
  const oeuvres = await getOeuvres();

  return rss({
    title: 'Arpeteria — dernières publications',
    description: 'Bibliothèque numérique de la culture savoyarde (arpitane) : nouvelles publications.',
    site: canonicalUrl('/'),
    items: oeuvres.map((oeuvre) => ({
      title: oeuvre.titre,
      description: oeuvre.description ? oeuvre.description.replace(/<[^>]+>/g, '') : undefined,
      pubDate: new Date(oeuvre.date_publication),
      link: `/oeuvre/${oeuvre.slug}`,
      author: oeuvre.auteur ?? undefined,
    })),
  });
};
