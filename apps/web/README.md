# apps/web — Site public Arpeteria (Astro)

Projet Astro autonome. Développement local :

```bash
cp .env.example .env   # Directus doit tourner sur DIRECTUS_URL (voir docker-compose.dev.yml)
npm install
npm run dev
```

Le build (`npm run build`) interroge l'API Directus (`DIRECTUS_URL`, `DIRECTUS_STATIC_TOKEN`) pour générer les pages statiques, puis indexe la recherche avec Pagefind. `DIRECTUS_PUBLIC_URL` est l'URL utilisée dans le HTML généré pour les images/PDF (doit être joignable par les visiteurs, contrairement à `DIRECTUS_URL` qui peut être une adresse interne au réseau Docker).

Voir [../../ARCHITECTURE.md](../../ARCHITECTURE.md) pour la structure des routes et le modèle de données.
