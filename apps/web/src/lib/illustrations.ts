// Illustrations par catégorie — en attendant un champ image dédié côté Directus, une
// correspondance slug → fichier statique suffit pour ce cas ponctuel. Partagé entre les
// pages de section (frise) et les pages de sous-catégorie (bandeau).

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
