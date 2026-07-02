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

/** Appelle l'API REST Directus authentifiée. Retourne `null` sur 404 (utile pour les checks d'existence). */
export async function directusRequest<T = unknown>(
  path: string,
  init: RequestInit = {}
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

  if (res.status === 404) return null;

  if (!res.ok) {
    throw new Error(`Directus API ${init.method ?? 'GET'} ${path} → ${res.status} : ${await res.text()}`);
  }

  if (res.status === 204) return null;

  const body = await res.json();
  return body.data as T;
}

export async function collectionExists(collection: string): Promise<boolean> {
  return (await directusRequest(`/collections/${collection}`)) !== null;
}

export async function fieldExists(collection: string, field: string): Promise<boolean> {
  return (await directusRequest(`/fields/${collection}/${field}`)) !== null;
}

export async function relationExists(collection: string, field: string): Promise<boolean> {
  return (await directusRequest(`/relations/${collection}/${field}`)) !== null;
}
