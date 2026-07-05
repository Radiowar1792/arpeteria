export type Section = 'archives' | 'contemporain';
export type TypeMedia = 'pdf' | 'video' | 'audio' | 'lien';
export type Langue = 'fr' | 'frp' | 'oc' | 'la';

export interface Categorie {
  id: string;
  nom: string;
  slug: string;
  section: Section;
  ordre: number;
  description: string | null;
  image: string | null;
}

export interface DirectusFile {
  id: string;
}

export interface Oeuvre {
  id: string;
  statut: 'brouillon' | 'publié';
  titre: string;
  slug: string;
  auteur: string | null;
  description: string | null;
  section: Section;
  categorie: Categorie | null;
  type_media: TypeMedia;
  fichier_pdf: DirectusFile | null;
  url_externe: string | null;
  couverture: DirectusFile | null;
  langue: Langue | null;
  date_oeuvre: string | null;
  orthographes: string[] | null;
  date_publication: string;
  mots_cles: string[] | null;
}

export interface Recommandation {
  id: string;
  nom_site: string;
  url: string;
  description: string | null;
  ordre: number;
}

export interface Article {
  id: string;
  statut: 'brouillon' | 'publié';
  titre: string;
  slug: string;
  chapo: string | null;
  contenu: string;
  image: string | null;
  date_publication: string;
  mots_cles: string[] | null;
}

export interface Personnage {
  id: string;
  statut: 'brouillon' | 'publié';
  nom: string;
  slug: string;
  periode: string | null;
  profession: string | null;
  portrait: string | null;
  biographie: string | null;
  date_publication: string;
  mots_cles: string[] | null;
}

export interface Lieu {
  id: string;
  statut: 'brouillon' | 'publié';
  nom: string;
  slug: string;
  commune: string | null;
  periode: string | null;
  description: string | null;
  photo: string | null;
  date_publication: string;
  mots_cles: string[] | null;
}

// URL interne utilisée pour interroger l'API au moment du build (réseau Docker en prod).
const DIRECTUS_URL = import.meta.env.DIRECTUS_URL ?? 'http://127.0.0.1:8055';
// URL publique utilisée dans le HTML généré (images, liens) — doit être joignable par les visiteurs.
export const DIRECTUS_PUBLIC_URL = import.meta.env.DIRECTUS_PUBLIC_URL ?? DIRECTUS_URL;
const DIRECTUS_STATIC_TOKEN = import.meta.env.DIRECTUS_STATIC_TOKEN;

async function directusFetch<T>(path: string): Promise<T | null> {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    headers: DIRECTUS_STATIC_TOKEN ? { Authorization: `Bearer ${DIRECTUS_STATIC_TOKEN}` } : {},
  });
  if (!res.ok) {
    throw new Error(`Directus ${path} → ${res.status} : ${await res.text()}`);
  }
  const body = await res.json();
  return (body.data as T) ?? null;
}

const OEUVRE_FIELDS = [
  'id',
  'statut',
  'titre',
  'slug',
  'auteur',
  'description',
  'section',
  'type_media',
  'url_externe',
  'langue',
  'date_oeuvre',
  'orthographes',
  'date_publication',
  'mots_cles',
  'categorie.id',
  'categorie.nom',
  'categorie.slug',
  'categorie.section',
  'fichier_pdf.id',
  'couverture.id',
].join(',');

export async function getOeuvres(
  options: { section?: Section; categorieSlug?: string } = {}
): Promise<Oeuvre[]> {
  const filters = ['filter[statut][_eq]=publié'];
  if (options.section) filters.push(`filter[section][_eq]=${options.section}`);
  if (options.categorieSlug) {
    filters.push(`filter[categorie][slug][_eq]=${encodeURIComponent(options.categorieSlug)}`);
  }
  const query = `${filters.join('&')}&fields=${OEUVRE_FIELDS}&sort=-date_publication`;
  return (await directusFetch<Oeuvre[]>(`/items/oeuvres?${query}`)) ?? [];
}

export async function getOeuvreBySlug(slug: string): Promise<Oeuvre | null> {
  const results = await directusFetch<Oeuvre[]>(
    `/items/oeuvres?filter[slug][_eq]=${encodeURIComponent(slug)}&filter[statut][_eq]=publié&fields=${OEUVRE_FIELDS}&limit=1`
  );
  return results?.[0] ?? null;
}

export async function getCategories(section?: Section): Promise<Categorie[]> {
  const filter = section ? `filter[section][_eq]=${section}&` : '';
  return (await directusFetch<Categorie[]>(`/items/categories?${filter}sort=ordre`)) ?? [];
}

export async function getCategorieBySlug(slug: string): Promise<Categorie | null> {
  const results = await directusFetch<Categorie[]>(
    `/items/categories?filter[slug][_eq]=${encodeURIComponent(slug)}&limit=1`
  );
  return results?.[0] ?? null;
}

export async function getRecommandations(): Promise<Recommandation[]> {
  return (await directusFetch<Recommandation[]>('/items/recommandations?sort=ordre')) ?? [];
}

export async function getArticles(): Promise<Article[]> {
  return (
    (await directusFetch<Article[]>('/items/articles?filter[statut][_eq]=publié&sort=-date_publication')) ?? []
  );
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const results = await directusFetch<Article[]>(
    `/items/articles?filter[slug][_eq]=${encodeURIComponent(slug)}&filter[statut][_eq]=publié&limit=1`
  );
  return results?.[0] ?? null;
}

export async function getPersonnages(): Promise<Personnage[]> {
  return (await directusFetch<Personnage[]>('/items/personnages?filter[statut][_eq]=publié&sort=nom')) ?? [];
}

export async function getPersonnageBySlug(slug: string): Promise<Personnage | null> {
  const results = await directusFetch<Personnage[]>(
    `/items/personnages?filter[slug][_eq]=${encodeURIComponent(slug)}&filter[statut][_eq]=publié&limit=1`
  );
  return results?.[0] ?? null;
}

export async function getLieux(): Promise<Lieu[]> {
  return (await directusFetch<Lieu[]>('/items/lieux?filter[statut][_eq]=publié&sort=nom')) ?? [];
}

export async function getLieuBySlug(slug: string): Promise<Lieu | null> {
  const results = await directusFetch<Lieu[]>(
    `/items/lieux?filter[slug][_eq]=${encodeURIComponent(slug)}&filter[statut][_eq]=publié&limit=1`
  );
  return results?.[0] ?? null;
}

interface OptionsTransformation {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpg' | 'png';
}

/**
 * URL d'un fichier Directus. Avec des options, utilise la transformation d'image à la
 * volée de Directus (redimensionnement + conversion de format côté serveur) plutôt que
 * de servir le fichier original en pleine résolution pour un simple vignette de 300px.
 */
export function assetUrl(fileId: string, options: OptionsTransformation = {}): string {
  const params = new URLSearchParams();
  if (options.width) params.set('width', String(options.width));
  if (options.height) params.set('height', String(options.height));
  if (options.width || options.height) {
    params.set('fit', 'cover');
    params.set('quality', String(options.quality ?? 82));
    params.set('format', options.format ?? 'webp');
  }
  const query = params.toString();
  return `${DIRECTUS_PUBLIC_URL}/assets/${fileId}${query ? `?${query}` : ''}`;
}
