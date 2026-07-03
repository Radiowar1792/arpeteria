/** Convertit un mot-clé libre (accents, espaces, casse variable) en identifiant d'URL. */
export function slugifierMotCle(mot: string): string {
  return mot
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
