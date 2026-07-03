/** Extrait l'identifiant vidéo d'une URL YouTube (watch, youtu.be, embed, shorts). */
export function extraireIdYoutube(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }

  const hote = u.hostname.replace(/^www\./, '');

  if (hote === 'youtu.be') {
    return u.pathname.slice(1).split('/')[0] || null;
  }

  if (hote === 'youtube.com' || hote === 'm.youtube.com' || hote === 'music.youtube.com') {
    if (u.pathname === '/watch') return u.searchParams.get('v');
    const correspondance = u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/);
    if (correspondance) return correspondance[1];
  }

  return null;
}
