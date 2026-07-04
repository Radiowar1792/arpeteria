# À faire / en attente

Fonctionnalités identifiées mais pas encore mises en place, parce qu'elles demandent une
décision ou une ressource externe de ta part. Rien d'urgent — à reprendre quand tu es prêt.

## Newsletter (Listmonk)

Gestionnaire de newsletter auto-hébergé (cohérent avec le reste du projet : Directus, Umami
sont déjà auto-hébergés plutôt que confiés à un service tiers).

**Ce qu'il faut de ton côté avant de commencer :** un compte SMTP pour l'envoi réel des emails
(Mailgun, Brevo, ou autre). Sans ça, Listmonk peut tourner et stocker des inscriptions, mais ne
pourra rien envoyer.

**Ce que je ferai une fois le SMTP choisi :**
- Service `listmonk` + sa base Postgres dans `docker-compose.yml` (même schéma qu'Umami).
- Formulaire d'inscription sur le site (probablement en pied de page et/ou page dédiée).
- Modèle d'email "nouvelle publication", à déclencher manuellement ou via le Flow Directus de
  rebuild déjà en place (Étape 13bis de `docs/deploiement.md`).

## API de données ouvertes

Endpoints JSON publics et documentés (`/api/oeuvres.json`, `/api/categories.json`...) pour que
des chercheurs ou d'autres sites réutilisent les données du fonds — dans l'esprit des vraies
bibliothèques numériques patrimoniales (Gallica, Europeana).

**Décisions à prendre avant de coder :**
- Quelles données exposer publiquement (tout le contenu publié, ou un sous-ensemble) ?
- Faut-il une licence explicite (ex. CC-BY, Licence Ouverte Etalab) affichée sur les données ?
- Pagination/format de réponse : JSON brut simple, ou un format standard (ex. JSON-LD, OAI-PMH
  utilisé par beaucoup d'institutions patrimoniales) ?

Techniquement faisable dès maintenant (pas de compte externe requis) — juste en attente de ces
choix pour ne pas partir dans une direction qu'il faudra défaire ensuite.

## Aperçu des brouillons pour le conservateur

Actuellement impossible de voir à quoi ressemblera une œuvre sur le site tant qu'elle n'est pas
publiée (le site est entièrement statique, généré uniquement à partir du contenu `publié`).

**Pourquoi ce n'est pas fait tout de suite :** la façon la plus sûre de faire ça — Directus a une
fonctionnalité "Live Preview" native, prévue exactement pour ce cas — demande de configurer un
point d'entrée sur le frontend capable d'afficher un brouillon sans jamais exposer les brouillons
publiquement. À concevoir avec soin (risque de sécurité si mal fait), pas quelque chose à
improviser rapidement.

## Champ image pour les catégories (fait le 2026-07-04)

~~Actuellement, illustrer une catégorie (période/discipline) demande de me redonner une image et
d'attendre un déploiement de code — pas idéal pour un usage courant.~~ Un vrai champ `image` a été
ajouté à la collection `categories` dans Directus (voir `scripts/bootstrap-schema.ts`) : possible
maintenant d'uploader/changer une image de catégorie directement depuis l'admin Directus, sans
recontacter Claude Code. Le mapping codé en dur (`lib/illustrations.ts`) reste utilisé en repli
tant qu'aucune image n'est renseignée côté Directus pour une catégorie donnée.

**Pour appliquer ce nouveau champ sur le LXC existant** (`bootstrap-schema.ts` ne retouche pas les
collections déjà créées) : ajouter manuellement le champ dans Directus (Paramètres → Modèles de
données → categories → Créer un champ → `image`, type Fichier/Image) — ou relancer
`npm run bootstrap` si tu préfères repartir d'une base neuve.
