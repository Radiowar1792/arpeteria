const SITE_URL = 'https://arpeteria.fr';

export function canonicalUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
