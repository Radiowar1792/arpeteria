# cms — Configuration Directus

Ce dossier ne contient **que de la configuration versionnée**. Directus lui-même tourne depuis l'image Docker officielle (`directus/directus:11`), rien n'est forké ici.

## Poser le schéma la première fois

Après `docker compose up`, les collections `oeuvres`, `categories` et `recommandations` (voir [ARCHITECTURE.md §5](../ARCHITECTURE.md#5-modèle-de-données-collections-directus)) n'existent pas encore. Deux façons de les créer :

1. **Recommandé — script idempotent** (voir [`../scripts/`](../scripts/)) :
   ```bash
   cd scripts
   npm install
   npm run bootstrap   # crée les collections, champs et relations
   npm run seed        # injecte les 13 catégories initiales (périodes + disciplines)
   ```
   Nécessite `DIRECTUS_ADMIN_URL`, `DIRECTUS_ADMIN_EMAIL`, `DIRECTUS_ADMIN_PASSWORD` dans `.env` (voir `.env.example`). Ces scripts peuvent être relancés sans risque : ils sautent ce qui existe déjà.

2. **Manuellement dans l'interface admin** — fonctionne aussi, mais rien n'est versionné tant que le snapshot n'est pas exporté (étape suivante).

## Rôles & permissions

Un seul compte existe au démarrage : l'administrateur créé via `ADMIN_EMAIL`/`ADMIN_PASSWORD` (le conservateur). Pour le `DIRECTUS_STATIC_TOKEN` utilisé par le build Astro (lecture seule des éléments publiés), crée un rôle restreint dans l'interface admin (**Paramètres → Rôles & permissions**) : lecture seule sur `oeuvres` (filtré `statut = publié`), `categories`, `recommandations` et `directus_files`, puis génère un token statique pour un utilisateur rattaché à ce rôle. Pas encore scripté : la gestion des rôles/policies dépend trop de la version de Directus pour être fiable sans tester contre une instance réelle.

## Versionner le schéma

- `snapshot/schema.yaml` — snapshot du modèle de données, à régénérer après toute modification de collections/champs (via le bootstrap ou l'interface admin) :
  ```bash
  npx directus schema snapshot ./cms/snapshot/schema.yaml
  ```
  et à appliquer sur une autre instance avec :
  ```bash
  npx directus schema apply ./cms/snapshot/schema.yaml
  ```
- `flows/` — documentation des Flows Directus (ex : webhook de rebuild à la publication).
- `extensions/` — extensions Directus custom éventuelles (vide au départ).
