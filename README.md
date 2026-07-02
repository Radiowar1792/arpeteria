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

Première fois : les collections n'existent pas encore dans Directus. Pose le schéma et les catégories initiales avec les scripts (voir [`cms/README.md`](./cms/README.md#poser-le-schéma-la-première-fois)) :

```bash
cd scripts && npm install && npm run bootstrap && npm run seed
```

## Déploiement en production

Voir [`docs/deploiement.md`](./docs/deploiement.md) pour la procédure complète, de zéro, sur un VPS Debian 12.

## Structure du monorepo

- `apps/web` — le site public (Astro)
- `cms/` — configuration Directus versionnée (schéma, flows)
- `infra/` — reverse proxy (Caddy), sauvegardes
- `scripts/` — outils (seed, vérification de liens)
- `docs/` — guide éditeur, déploiement, sauvegardes
