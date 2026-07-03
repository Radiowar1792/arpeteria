/** Extrait le nom d'hôte (sans "www.") d'une URL, ou une chaîne vide si invalide. */
export function extraireHote(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
