import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getOeuvres, getArticles } from '../lib/directus.ts';
import { canonicalUrl } from '../lib/seo.ts';

export const GET: APIRoute = async () => {
  const [oeuvres, articles] = await Promise.all([getOeuvres(), getArticles()]);

  const itemsOeuvres = oeuvres.map((oeuvre) => ({
    title: oeuvre.titre,
    description: oeuvre.description ? oeuvre.description.replace(/<[^>]+>/g, '') : undefined,
    pubDate: new Date(oeuvre.date_publication),
    link: `/oeuvre/${oeuvre.slug}`,
    author: oeuvre.auteur ?? undefined,
  }));

  const itemsArticles = articles.map((article) => ({
    title: `Actualité — ${article.titre}`,
    description: article.chapo ?? undefined,
    pubDate: new Date(article.date_publication),
    link: `/actualites/${article.slug}`,
  }));

  const items = [...itemsOeuvres, ...itemsArticles].sort(
    (a, b) => b.pubDate.getTime() - a.pubDate.getTime()
  );

  return rss({
    title: 'Arpeteria — dernières publications',
    description: 'Bibliothèque numérique de la culture savoyarde (arpitane) : nouvelles publications et actualités.',
    site: canonicalUrl('/'),
    items,
  });
};
