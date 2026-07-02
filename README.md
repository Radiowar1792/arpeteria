# Arpeteria

Bibliothèque numérique de la culture savoyarde (arpitane) : archives historiques et créations contemporaines.

Voir [ARCHITECTURE.md](./ARCHITECTURE.md) pour le document de fondation complet (objectifs, stack, modèle de données, feuille de route).

## Démarrage rapide (développement local)

```bash
cp .env.example .env   # puis éditer les valeurs
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

- Site : http://localhost:4321
- Directus (admin) : http://localhost:8055

## Structure du monorepo

- `apps/web` — le site public (Astro)
- `cms/` — configuration Directus versionnée (schéma, flows)
- `infra/` — reverse proxy (Caddy), sauvegardes
- `scripts/` — outils (seed, vérification de liens)
- `docs/` — guide éditeur, déploiement, sauvegardes
