/**
 * Injecte les catégories initiales (périodes d'archives + disciplines contemporaines)
 * décrites dans ARCHITECTURE.md §5. Idempotent : ignore les slugs déjà présents.
 *
 * Usage : npm run seed   (depuis scripts/, après npm run bootstrap)
 */
import { directusRequest } from './lib/directus-client.ts';

interface CategorySeed {
  nom: string;
  slug: string;
  section: 'archives' | 'contemporain';
  ordre: number;
}

const categories: CategorySeed[] = [
  { nom: 'Période médiévale', slug: 'periode-medievale', section: 'archives', ordre: 1 },
  { nom: 'Renaissance', slug: 'renaissance', section: 'archives', ordre: 2 },
  { nom: 'XVIIe siècle', slug: 'xviie-siecle', section: 'archives', ordre: 3 },
  { nom: 'XIXe siècle', slug: 'xixe-siecle', section: 'archives', ordre: 4 },
  { nom: 'Début XXe siècle', slug: 'debut-xxe-siecle', section: 'archives', ordre: 5 },
  { nom: 'Fin XXe siècle', slug: 'fin-xxe-siecle', section: 'archives', ordre: 6 },
  { nom: 'Début XXIe siècle', slug: 'debut-xxie-siecle', section: 'archives', ordre: 7 },

  { nom: 'Science', slug: 'science', section: 'contemporain', ordre: 1 },
  { nom: 'Chansons et poésie', slug: 'chansons-et-poesie', section: 'contemporain', ordre: 2 },
  { nom: 'Arts visuels', slug: 'arts-visuels', section: 'contemporain', ordre: 3 },
  { nom: 'Vidéos', slug: 'videos', section: 'contemporain', ordre: 4 },
  { nom: 'Grammaires', slug: 'grammaires', section: 'contemporain', ordre: 5 },
  { nom: 'Lexicographie', slug: 'lexicographie', section: 'contemporain', ordre: 6 },
];

async function categoryExists(slug: string): Promise<boolean> {
  const result = await directusRequest<CategorySeed[]>(
    `/items/categories?filter[slug][_eq]=${encodeURIComponent(slug)}&limit=1`
  );
  return Boolean(result && result.length > 0);
}

async function main() {
  for (const category of categories) {
    if (await categoryExists(category.slug)) {
      console.log(`↷ catégorie "${category.slug}" existe déjà`);
      continue;
    }
    await directusRequest('/items/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    });
    console.log(`✓ catégorie "${category.slug}" créée`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
