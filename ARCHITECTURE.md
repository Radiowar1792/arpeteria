# Arpeteria — Document de fondation du projet

> Bibliothèque numérique de la culture savoyarde (arpitane) : archives historiques et créations contemporaines.
> Version du document : 1.0 — Juillet 2026

---

## 1. Objectif du projet

**Arpeteria** est un site de diffusion culturelle dont la mission est de **référencer, numériser (scanner) et diffuser** des œuvres de la culture savoyarde — anciennes, oubliées et contemporaines — principalement sous forme de **PDF**, complétés par des liens externes (vidéos, audios, sites recommandés).

### Objectifs fonctionnels

| # | Objectif | Détail |
|---|----------|--------|
| 1 | Diffusion de PDF | Chaque œuvre a sa propre page (fiche) + PDF consultable/téléchargeable |
| 2 | Deux grandes sections | **Archives** (par période historique) et **Créations contemporaines** (par discipline) |
| 3 | Liens externes | Recommandations de sites, liens vers vidéos (YouTube, PeerTube…) et audios |
| 4 | Administration simple | Interface d'admin **no-code** pour un seul éditeur (le conservateur), avec formulaires guidés par type de contenu |
| 5 | Performance & SEO | Site statique ultra-rapide, référencement maximal (pages HTML par œuvre, Schema.org, sitemap) |

### Objectifs non-fonctionnels

- **Modulaire** : chaque brique (frontend, CMS, infra) est indépendante et remplaçable.
- **Sobre en maintenance** : le minimum de services à surveiller (pas de Redis, pas de MinIO, pas de Meilisearch au lancement).
- **Souveraineté** : hébergement en France (Scaleway ou OVH), données maîtrisées.
- **Évolutif** : possibilité d'ajouter plus tard un moteur de recherche serveur (Meilisearch), un stockage objet (Scaleway S3), ou de l'i18n (français / arpitan / anglais).

### Identité

- **Nom** : Arpeteria (de *arpitan*)
- **Thème visuel** : rouge, noir et blanc pour les parties textuelles (croix de Savoie)
- **Langue du site** : français (prévoir `inLanguage: frp` sur les œuvres en arpitan/savoyard)

---

## 2. Structure éditoriale du site

```
arpeteria.fr
│
├── /                                  → Page d'accueil
│
├── /archives                          → Index des archives
│   ├── /archives/periode-medievale
│   ├── /archives/renaissance
│   ├── /archives/xviie-siecle
│   ├── /archives/xixe-siecle
│   ├── /archives/debut-xxe-siecle
│   ├── /archives/fin-xxe-siecle
│   └── /archives/debut-xxie-siecle
│
├── /contemporain                      → Index des créations contemporaines
│   ├── /contemporain/science
│   ├── /contemporain/chansons-et-poesie
│   ├── /contemporain/arts-visuels
│   ├── /contemporain/videos
│   ├── /contemporain/grammaires
│   └── /contemporain/lexicographie
│
├── /oeuvre/[slug]                     → Fiche d'une œuvre (LA page SEO)
│   └── ex: /oeuvre/chansons-populaires-savoie-1846
│
├── /recommandations                   → Liens vers sites amis / ressources
├── /recherche                         → Recherche full-text (Pagefind)
└── /a-propos                          → Le projet ect...
```

**Règle d'or SEO** : un PDF n'est **jamais** lié directement depuis une liste. On passe toujours par sa fiche `/oeuvre/[slug]` qui contient titre, auteur, période, description riche, métadonnées Schema.org, puis le lecteur/bouton PDF. C'est la fiche que Google indexe.

---

## 3. Architecture technique

```
┌────────────────────────────────────────────────────────────────┐
│                     ARCHITECTURE ARPETERIA                     │
│                                                                │
│   ÉDITEUR (conservateur)                                       │
│        │  publie via formulaires                               │
│        ▼                                                       │
│  ┌───────────────────────────── VPS (Scaleway/OVH, France) ─┐  │
│  │                                                          │  │
│  │   Caddy (reverse proxy, HTTPS auto)                      │  │
│  │     ├── admin.arpeteria.fr  → Directus (CMS headless)    │  │
│  │     │                          │                         │  │
│  │     │                          ├── PostgreSQL (données)  │  │
│  │     │                          └── /uploads (PDF, imgs)  │  │
│  │     │                                                    │  │
│  │     └── arpeteria.fr        → Site statique Astro        │  │
│  │                                (fichiers HTML générés)   │  │
│  │                                                          │  │
│  │   Webhook Directus ──déclenche──► Rebuild Astro (SSG)    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│   Variante : le site statique peut être servi par              │
│   Cloudflare Pages (CDN mondial, gratuit) au lieu du VPS.      │
└────────────────────────────────────────────────────────────────┘
```

### Les briques

| Brique | Techno | Rôle | Pourquoi |
|--------|--------|------|----------|
| Frontend | **Astro** (SSG) | Génère le site en HTML statique | JS quasi nul côté client, Lighthouse 100, SEO natif |
| CMS | **Directus 11** | Interface admin + API REST/GraphQL | No-code pour l'éditeur, gestion fichiers native, gratuit self-hosted |
| BDD | **PostgreSQL 16** | Métadonnées des œuvres | Robuste, la référence, livré avec Directus |
| Fichiers | Volume Docker Directus | Stockage des PDF/images | Zéro service en plus ; migrable vers Scaleway S3 en 3 variables d'env |
| Recherche | **Pagefind** | Recherche full-text statique | Index généré au build, s'exécute dans le navigateur, zéro serveur |
| Proxy | **Caddy 2** | HTTPS automatique, routage | Config triviale, Let's Encrypt intégré |
| Orchestration | **Docker Compose** | Tout tient dans un fichier | Reproductible, versionné dans le repo |
| CI/CD | **GitHub Actions** | Build + déploiement auto | Rebuild du site à chaque publication (webhook) ou push |

### Ce qu'on n'installe PAS (et pourquoi)

- **Redis** → aucun cache serveur nécessaire : le site est statique.
- **MinIO** → le stockage local Directus suffit ; migration S3 (Scaleway) possible sans refonte si le corpus explose.
- **Meilisearch** → Pagefind couvre largement jusqu'à ~10 000 pages ; ajout possible plus tard comme service Docker supplémentaire, sans toucher au reste (c'est ça, la modularité).

---

## 4. Arborescence du monorepo GitHub

Un **seul repo** `arpeteria` contenant tout : frontend, config CMS, infra, docs, scripts.
Principe : **1 dossier racine = 1 responsabilité**. Chaque module a son propre README.

```
arpeteria/
│
├── README.md                    # Présentation, démarrage rapide (quickstart)
├── ARCHITECTURE.md              # Ce document
├── LICENSE
├── .gitignore
├── .env.example                 # Modèle des variables d'environnement (JAMAIS de secrets commités)
│
├── docker-compose.yml           # Orchestration production (Directus + Postgres + Caddy + site)
├── docker-compose.dev.yml       # Surcharge pour le développement local
│
├── apps/
│   └── web/                     # ── LE SITE PUBLIC (Astro) ──
│       ├── README.md
│       ├── package.json
│       ├── astro.config.mjs     # Config Astro : sitemap, intégrations
│       ├── public/              # Assets statiques (favicon, robots.txt, fonts)
│       │   └── robots.txt
│       ├── src/
│       │   ├── pages/           # Routes = fichiers (règle Astro)
│       │   │   ├── index.astro                      # Accueil
│       │   │   ├── archives/
│       │   │   │   ├── index.astro                  # Index archives
│       │   │   │   └── [periode]/index.astro        # Pages par période (dynamiques)
│       │   │   ├── contemporain/
│       │   │   │   ├── index.astro
│       │   │   │   └── [discipline]/index.astro
│       │   │   ├── oeuvre/
│       │   │   │   └── [slug].astro                 # Fiche œuvre (générée par œuvre)
│       │   │   ├── recommandations.astro
│       │   │   ├── recherche.astro                  # Page Pagefind
│       │   │   └── a-propos.astro
│       │   ├── layouts/
│       │   │   ├── Base.astro                       # <head>, meta, thème rouge/noir/blanc
│       │   │   └── Oeuvre.astro                      # Layout fiche œuvre + Schema.org
│       │   ├── components/
│       │   │   ├── Header.astro
│       │   │   ├── Footer.astro
│       │   │   ├── CarteOeuvre.astro                 # Vignette dans les listes
│       │   │   ├── LecteurPDF.astro                  # Embed/bouton PDF
│       │   │   ├── LienExterne.astro                 # Vidéo/audio/site externe
│       │   │   └── SchemaOrg.astro                   # Données structurées JSON-LD
│       │   ├── lib/
│       │   │   ├── directus.ts                       # Client API Directus (SDK)
│       │   │   ├── taxonomies.ts                      # Périodes & disciplines (source de vérité)
│       │   │   └── seo.ts                             # Helpers meta/OpenGraph
│       │   └── styles/
│       │       └── global.css                        # Thème : variables CSS rouge/noir/blanc
│       └── Dockerfile                                 # Build du site (multi-stage → fichiers statiques)
│
├── cms/                         # ── CONFIGURATION DIRECTUS ──
│   ├── README.md                # Comment appliquer/exporter le schéma
│   ├── snapshot/
│   │   └── schema.yaml          # Snapshot du modèle de données (directus schema snapshot)
│   ├── flows/
│   │   └── rebuild-on-publish.md  # Doc du Flow "webhook → rebuild du site"
│   └── extensions/              # (vide au départ) extensions Directus custom éventuelles
│
├── infra/                       # ── INFRASTRUCTURE ──
│   ├── README.md
│   ├── caddy/
│   │   └── Caddyfile            # Routage arpeteria.fr / admin.arpeteria.fr
│   └── backup/
│       └── backup.sh            # Dump Postgres + archive uploads → stockage externe
│
├── scripts/                     # ── OUTILS ──
│   ├── seed.ts                  # Injecte les taxonomies (périodes, disciplines) dans Directus
│   └── check-links.ts           # Vérifie les liens externes morts (cron mensuel)
│
├── docs/                        # ── DOCUMENTATION ──
│   ├── guide-editeur.md         # Guide illustré pour le conservateur (ajouter une œuvre pas à pas)
│   ├── deploiement.md           # Procédure de déploiement complète
│   └── sauvegardes.md           # Stratégie de backup et restauration
│
└── .github/
    └── workflows/
        ├── deploy-web.yml       # Build Astro + déploiement (sur push et sur webhook Directus)
        └── ci.yml               # Lint + build de vérification sur les PR
```

### Pourquoi cette organisation est modulaire

- **`apps/web`** est un projet Astro autonome : il se développe, se teste et se build seul (`npm run dev` dedans suffit). Demain, on pourrait ajouter `apps/admin-custom` ou `apps/mobile` sans rien casser.
- **`cms/`** ne contient **que de la configuration versionnée** (le schéma Directus exporté en YAML). Directus lui-même tourne depuis son image Docker officielle — on ne fork rien.
- **`infra/`** isole tout ce qui touche au serveur. Changer de reverse proxy = changer un dossier.
- **`docs/`** rend le projet transmissible : si quelqu'un reprend le projet dans 5 ans, tout est là.
- Le **`docker-compose.yml` à la racine** est le point d'entrée unique : `docker compose up -d` et tout démarre.

---

## 5. Modèle de données (collections Directus)

### Collection `oeuvres` (la collection centrale)

| Champ | Type | Détail |
|-------|------|--------|
| `id` | uuid | Auto |
| `statut` | select | `brouillon` / `publié` (workflow de publication) |
| `titre` | string | Obligatoire |
| `slug` | string | URL, auto-généré depuis le titre, modifiable |
| `auteur` | string | Auteur ou "Anonyme" / "Collectif" |
| `description` | richtext (WYSIWYG) | Le cœur du SEO — encourager 150+ mots |
| `section` | select | `archives` / `contemporain` |
| `categorie` | M2O → `categories` | Période OU discipline selon la section |
| `type_media` | select | `pdf` / `video` / `audio` / `lien` |
| `fichier_pdf` | file | Upload PDF (si type = pdf) |
| `url_externe` | string | Lien YouTube/PeerTube/audio/site (si type ≠ pdf) |
| `couverture` | image | Vignette pour les listes et l'OpenGraph — voir dimensions recommandées ci-dessous |
| `langue` | select | `fr` / `frp` (arpitan) / `oc` (occitan) / `la` (latin)… |
| `date_oeuvre` | string | Date ou période de l'œuvre originale (texte libre : "vers 1846") |
| `date_publication` | datetime | Auto — date d'ajout sur le site |
| `mots_cles` | tags | Pour la recherche et les meta keywords |

#### Dimensions recommandées pour `couverture`

Les cartes (accueil, listes archives/contemporain) affichent cette image en **format 4:3**
(recadrage automatique — `object-fit: cover`, voir `apps/web/src/styles/global.css`), et la
réutilisent pour l'OpenGraph (aperçu de partage sur les réseaux sociaux).

- **Ratio** : 4:3 (paysage) — une image trop verticale (portrait) ou trop panoramique sera recadrée
  sur les bords.
- **Taille conseillée** : **1200 × 900 px** (suffisant pour un affichage net sur écrans haute
  densité, sans être inutilement lourd).
- **Minimum acceptable** : 800 × 600 px.
- **Format** : JPEG ou WebP, viser < 300 Ko après export (Directus ne compresse pas à l'upload).

### Collection `categories`

| Champ | Type | Détail |
|-------|------|--------|
| `nom` | string | ex : "XIXᵉ siècle", "Chansons et poésie" |
| `slug` | string | ex : `xixe-siecle` |
| `section` | select | `archives` / `contemporain` |
| `ordre` | integer | Ordre d'affichage |
| `description` | text | Intro SEO de la page catégorie |

Valeurs initiales (injectées par `scripts/seed.ts`) :

- **Archives** : Période médiévale · Renaissance · XVIIᵉ siècle · XIXᵉ siècle · Début XXᵉ siècle · Fin XXᵉ siècle · Début XXIᵉ siècle
- **Contemporain** : Science · Chansons et poésie · Arts visuels · Vidéos · Grammaires · Lexicographie

### Collection `recommandations`

| Champ | Type |
|-------|------|
| `nom_site` | string |
| `url` | string |
| `description` | text |
| `ordre` | integer |

### L'expérience éditeur (le "template pro")

Dans Directus, l'éditeur voit un menu latéral : **Œuvres · Catégories · Recommandations · Fichiers**. Il clique "＋", remplit le formulaire (les champs conditionnels s'affichent selon `type_media` : le champ PDF n'apparaît que si type = pdf), passe le statut à "publié" → un **Flow Directus** appelle le webhook GitHub Actions → le site est reconstruit et en ligne en ~2 minutes. Aucune ligne de code, jamais.

---

## 6. docker-compose.yml (production)

Voir le fichier [`docker-compose.yml`](./docker-compose.yml) à la racine du repo, et [`infra/caddy/Caddyfile`](./infra/caddy/Caddyfile) pour le routage.

### .env.example

Voir [`.env.example`](./.env.example) à la racine du repo.

> ⚠️ Le fichier `.env` réel est dans `.gitignore`. Seul `.env.example` (sans secrets) est commité.

---

## 7. Flux de publication (le cœur du système)

```
Le conservateur publie une œuvre dans Directus
        │
        ▼
Flow Directus (déclencheur : "item publié dans oeuvres")
        │
        ▼  POST https://api.github.com/repos/<org>/arpeteria/dispatches
GitHub Actions : workflow deploy-web.yml
        │
        ├── 1. npm ci && npm run build   (Astro interroge l'API Directus,
        │        génère une page HTML par œuvre + index + sitemap)
        ├── 2. npx pagefind --site dist  (index de recherche)
        └── 3. Déploiement :
             • Option A : push vers Cloudflare Pages (CDN, gratuit)
             • Option B : rsync/rebuild de l'image `web` sur le VPS
        │
        ▼
Site à jour en ~2 minutes, notification possible (email/Discord)
```

**Le conservateur ne voit rien de tout ça.** Il publie, il attend 2 minutes, c'est en ligne.

---

## 8. SEO — checklist intégrée au frontend

- [ ] **1 œuvre = 1 page HTML** avec URL propre `/oeuvre/[slug]`
- [ ] **Schema.org JSON-LD** sur chaque fiche : `CreativeWork` / `Book` / `MusicComposition`, avec `author`, `datePublished`, `inLanguage` (`frp` pour l'arpitan)
- [ ] **Title & meta description** uniques par page, générés depuis les champs Directus
- [ ] **OpenGraph + Twitter Cards** (image de couverture de l'œuvre)
- [ ] **Sitemap.xml** auto (`@astrojs/sitemap`) + `robots.txt`
- [ ] **URLs hiérarchiques** reflétant la taxonomie (`/archives/xixe-siecle/…`)
- [ ] **Fil d'Ariane** (breadcrumb) avec balisage `BreadcrumbList`
- [ ] **Images optimisées** (composant `<Image>` d'Astro : WebP/AVIF, lazy-loading)
- [ ] **Maillage interne** : chaque fiche propose des œuvres de la même catégorie
- [ ] **Performance** : viser Lighthouse ≥ 95 partout (natif avec Astro SSG)
- [ ] Déclarer le site dans **Google Search Console** + **Bing Webmaster Tools**

---

## 9. Sauvegardes & pérennité

Deux choses à sauvegarder, un script (`infra/backup/backup.sh`), un cron quotidien :

1. **PostgreSQL** : `pg_dump` quotidien, conservé 30 jours.
2. **Volume `directus_uploads`** (les PDF !) : archive incrémentale (restic ou rclone) vers un stockage externe (Scaleway Object Storage / autre lieu physique).

Règle **3-2-1** : 3 copies, 2 supports, 1 hors site. Pour un projet patrimonial, c'est non négociable — les scans sont potentiellement irremplaçables.

Le code, lui, est déjà sauvegardé : c'est le repo GitHub. Le schéma Directus est versionné dans `cms/snapshot/schema.yaml` (`npx directus schema snapshot`).

---

## 10. Feuille de route

| Phase | Contenu | Livrable |
|-------|---------|----------|
| **0. Fondation** | Repo GitHub, docker-compose, VPS, DNS | `docker compose up` fonctionne, Directus accessible |
| **1. Modèle de données** | Collections Directus, seed des catégories, rôles | Le conservateur peut ajouter une œuvre test |
| **2. Frontend MVP** | Accueil, listes, fiche œuvre, thème rouge/noir/blanc | Site navigable avec 5-10 œuvres réelles |
| **3. Publication auto** | Flow Directus → GitHub Actions → déploiement | Publication en autonomie complète |
| **4. SEO & recherche** | Schema.org, sitemap, Pagefind, Search Console | Indexation Google |
| **5. Lancement** | Guide éditeur, sauvegardes, monitoring (UptimeRobot) | Mise en production |
| **6. Évolutions** | i18n arpitan, Meilisearch, IIIF pour les scans, newsletter | Selon les besoins réels |

---

## 11. Coûts estimés

| Poste | Coût |
|-------|------|
| VPS Scaleway DEV1-M ou OVH équivalent (4 Go RAM) | ~10-15 €/mois |
| Nom de domaine `.fr` | ~7 €/an |
| Cloudflare Pages (frontend) | 0 € |
| GitHub (repo + Actions) | 0 € |
| Sauvegarde externe (Scaleway Object Storage, ~50 Go) | ~0,60 €/mois |
| **Total** | **≈ 12-16 €/mois** |

---

## 12. Glossaire rapide

- **SSG** (Static Site Generation) : le site est généré une fois pour toutes en fichiers HTML à chaque publication, au lieu d'être calculé à chaque visite. → vitesse et SEO maximaux.
- **CMS headless** : un CMS qui ne gère que le contenu et l'admin, sans imposer le rendu. Le frontend (Astro) consomme son API.
- **Webhook** : une URL appelée automatiquement quand un événement survient (ici : "œuvre publiée" → "reconstruis le site").
- **Monorepo** : un seul dépôt Git contenant tous les modules du projet.
