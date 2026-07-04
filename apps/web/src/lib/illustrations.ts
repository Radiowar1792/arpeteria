import { assetUrl, type Categorie } from './directus.ts';

// Un vrai champ `image` existe maintenant sur la collection `categories` dans Directus —
// voir scripts/bootstrap-schema.ts. Ces correspondances slug → fichier statique ne servent
// plus que de repli pour les catégories où ce champ n'est pas encore renseigné (ou pour un
// déploiement dont le schéma n'a pas encore ce champ).

export const ILLUSTRATIONS_PERIODES: Record<string, string> = {
  'periode-medievale': '/images/categories/periode-medievale.webp',
  renaissance: '/images/categories/renaissance.webp',
  'xviie-siecle': '/images/categories/xviie-siecle.webp',
  'xixe-siecle': '/images/categories/xixe-siecle.webp',
  'debut-xxe-siecle': '/images/categories/debut-xxe-siecle.webp',
  'fin-xxe-siecle': '/images/categories/fin-xxe-siecle.webp',
  'debut-xxie-siecle': '/images/categories/debut-xxie-siecle.webp',
};

export const ILLUSTRATIONS_DISCIPLINES: Record<string, string> = {
  science: '/images/categories/science.webp',
  'chansons-et-poesie': '/images/categories/chansons-et-poesie.webp',
  'arts-visuels': '/images/categories/arts-visuels.webp',
  videos: '/images/categories/videos.webp',
  grammaires: '/images/categories/grammaires.webp',
  lexicographie: '/images/categories/lexicographie.webp',
};

/** Image Directus de la catégorie si renseignée, sinon repli sur le mapping codé en dur. */
export function illustrationCategorie(categorie: Categorie, repli: Record<string, string>): string | undefined {
  if (categorie.image) {
    return assetUrl(categorie.image, { width: 960, height: 640 });
  }
  return repli[categorie.slug];
}
