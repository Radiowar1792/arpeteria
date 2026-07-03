import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// scripts/lib/ → ../../ → racine du repo, où vit le .env réel.
config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

const DIRECTUS_ADMIN_URL = process.env.DIRECTUS_ADMIN_URL;
const DIRECTUS_ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL;
const DIRECTUS_ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD;

if (!DIRECTUS_ADMIN_URL || !DIRECTUS_ADMIN_EMAIL || !DIRECTUS_ADMIN_PASSWORD) {
  throw new Error(
    'DIRECTUS_ADMIN_URL, DIRECTUS_ADMIN_EMAIL et DIRECTUS_ADMIN_PASSWORD doivent être définis (voir .env.example).'
  );
}

let cachedToken: string | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken) return cachedToken;

  const res = await fetch(`${DIRECTUS_ADMIN_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: DIRECTUS_ADMIN_EMAIL, password: DIRECTUS_ADMIN_PASSWORD }),
  });

  if (!res.ok) {
    throw new Error(`Échec de connexion à Directus (${res.status}) : ${await res.text()}`);
  }

  const { data } = await res.json();
  cachedToken = data.access_token as string;
  return cachedToken;
}

/**
 * Appelle l'API REST Directus authentifiée. Retourne `null` sur 404.
 *
 * `notFoundStatuses` permet d'ajouter 403 à la liste des statuts traités comme
 * "n'existe pas" : sur les lookups par nom (`/collections/:c`, `/fields/:c/:f`,
 * `/relations/:c/:f`), Directus répond 403 — pas 404 — quand la ressource
 * n'existe pas, même pour un compte admin complet (comportement volontaire,
 * pour ne pas laisser deviner l'existence d'une ressource via le code HTTP).
 * Sans ça, les checks d'existence (`collectionExists` etc.) plantent au tout
 * premier bootstrap au lieu de conclure "n'existe pas encore, à créer".
 */
export async function directusRequest<T = unknown>(
  path: string,
  init: RequestInit = {},
  { notFoundStatuses = [404] }: { notFoundStatuses?: number[] } = {}
): Promise<T | null> {
  const token = await getAccessToken();

  const res = await fetch(`${DIRECTUS_ADMIN_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });

  if (notFoundStatuses.includes(res.status)) return null;

  if (!res.ok) {
    throw new Error(`Directus API ${init.method ?? 'GET'} ${path} → ${res.status} : ${await res.text()}`);
  }

  if (res.status === 204) return null;

  const body = await res.json();
  return body.data as T;
}

export async function collectionExists(collection: string): Promise<boolean> {
  return (
    (await directusRequest(`/collections/${collection}`, {}, { notFoundStatuses: [404, 403] })) !== null
  );
}

export async function fieldExists(collection: string, field: string): Promise<boolean> {
  return (
    (await directusRequest(`/fields/${collection}/${field}`, {}, { notFoundStatuses: [404, 403] })) !== null
  );
}

export async function relationExists(collection: string, field: string): Promise<boolean> {
  return (
    (await directusRequest(`/relations/${collection}/${field}`, {}, { notFoundStatuses: [404, 403] })) !==
    null
  );
}
