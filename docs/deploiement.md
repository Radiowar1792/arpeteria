# Déploiement — de zéro sur un VPS Debian 12

Guide pas à pas pour déployer Arpeteria sur un serveur Debian 12 ("bookworm") vierge (Scaleway, OVH, ou autre). Compte ~45-60 minutes.

## Prérequis

- Un VPS Debian 12 avec au moins 2 Go de RAM (4 Go recommandé — voir [Étape 5bis](#étape-5bis--swap-si-vps-≤-2-go-de-ram)).
- Un nom de domaine (ex. `arpeteria.fr`) dont tu peux gérer les enregistrements DNS.
- Un accès SSH root (ou sudo) au VPS.

---

## Étape 1 — Connexion et mise à jour du système

```bash
ssh root@IP_DU_VPS
apt update && apt full-upgrade -y
apt install -y curl ca-certificates git ufw openssl sudo
```

## Étape 2 — Créer un utilisateur non-root

Ne pas faire tourner Docker en root au quotidien.

```bash
adduser conservateur
usermod -aG sudo conservateur
su - conservateur
```

À partir d'ici, toutes les commandes s'exécutent en tant que `conservateur` (avec `sudo` quand nécessaire).

## Étape 3 — Sécuriser SSH (recommandé)

```bash
sudo nano /etc/ssh/sshd_config
```

Vérifier/ajuster :

```
PermitRootLogin no
PasswordAuthentication no   # seulement si une clé SSH est déjà configurée pour `conservateur`
```

```bash
sudo systemctl restart ssh
```

> ⚠️ Teste la connexion SSH avec `conservateur` **dans un nouveau terminal** avant de fermer la session actuelle, pour ne pas te retrouver bloqué dehors.

## Étape 4 — Pare-feu (ufw)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

## Étape 5 — Installer Docker Engine + Compose

Dépôt officiel Docker pour Debian :

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker $USER
```

Déconnecte-toi puis reconnecte-toi (`exit` puis `ssh conservateur@IP_DU_VPS`) pour que l'appartenance au groupe `docker` prenne effet, puis vérifie :

```bash
docker run hello-world
docker compose version
```

## Étape 5bis — Swap (si VPS ≤ 2 Go de RAM)

Le build Astro (`npm install` + `astro build`) dans l'image `web` peut consommer beaucoup de mémoire sur un petit VPS. Ajoute 2 Go de swap par précaution :

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Étape 6 — Configurer le DNS

Chez ton registrar / fournisseur DNS, crée deux enregistrements **A** pointant vers l'IP publique du VPS :

| Type | Nom | Valeur |
|------|-----|--------|
| A | `arpeteria.fr` (ou `@`) | IP du VPS |
| A | `admin.arpeteria.fr` | IP du VPS |

Vérifie la propagation avant de continuer (peut prendre de quelques minutes à quelques heures) :

```bash
dig +short arpeteria.fr
dig +short admin.arpeteria.fr
```

Caddy (Étape 9) a besoin que ces deux domaines résolvent vers le VPS pour obtenir automatiquement les certificats HTTPS (Let's Encrypt).

## Étape 7 — Cloner le repo

```bash
git clone https://github.com/Radiowar1792/arpeteria.git
cd arpeteria
```

## Étape 8 — Configurer `.env`

```bash
cp .env.example .env
nano .env
```

Génère des valeurs fortes pour les secrets :

```bash
openssl rand -hex 32     # → DIRECTUS_SECRET
openssl rand -base64 24  # → DB_PASSWORD
openssl rand -base64 24  # → DIRECTUS_ADMIN_PASSWORD
```

Renseigne dans `.env` :

- `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`
- `DIRECTUS_SECRET`
- `DIRECTUS_ADMIN_EMAIL` (l'adresse du conservateur)
- `DIRECTUS_ADMIN_PASSWORD`
- `DIRECTUS_STATIC_TOKEN` — **laisse vide pour l'instant**, il sera généré à l'étape 11
- `DIRECTUS_ADMIN_URL=http://127.0.0.1:8055` (déjà la valeur par défaut — correcte sur le VPS grâce au port publié en local uniquement, voir Étape 9). Utilise bien `127.0.0.1`, pas `localhost` : sur Debian, Node résout souvent `localhost` en `::1` (IPv6) en priorité, alors que Docker ne publie le port qu'en IPv4 — la connexion échouerait en `ECONNREFUSED`.

## Étape 9 — Démarrer la base et Directus (sans le site pour l'instant)

Le site (`web`) a besoin du token statique pour son build, qui n'existe pas encore. On démarre donc d'abord la base de données, Directus et Caddy :

```bash
docker compose up -d database directus caddy
docker compose logs -f directus   # Ctrl+C une fois "Server started" affiché
```

Directus est maintenant joignable en local sur le VPS via `http://127.0.0.1:8055` (lié à `127.0.0.1`, jamais exposé publiquement — voir `docker-compose.yml`). Caddy tente déjà d'obtenir les certificats HTTPS pour `arpeteria.fr`/`admin.arpeteria.fr` (normal que `arpeteria.fr` renvoie une erreur temporaire tant que `web` n'est pas démarré).

> ⚠️ Ne lance jamais `docker compose up -d --build` (sans préciser de service) à ce stade : ça tenterait aussi de builder `web`, qui a besoin de `DIRECTUS_STATIC_TOKEN` (pas encore généré, voir Étape 11) et de Directus déjà démarré. Utilise toujours la forme ciblée `docker compose up -d database directus caddy` jusqu'à l'Étape 12.

## Étape 10 — Poser le schéma Directus et semer les catégories

```bash
cd scripts
npm install
npm run bootstrap   # crée les collections oeuvres / categories / recommandations
npm run seed        # injecte les 13 catégories initiales
cd ..
```

Vérifie dans `https://admin.arpeteria.fr` (une fois HTTPS actif) ou en te connectant temporairement via un tunnel SSH que les collections sont bien présentes.

## Étape 11 — Créer le token statique en lecture seule

Dans l'interface admin Directus (**Paramètres → Rôles & permissions**) :

1. Crée un rôle `Lecteur site` avec permission **lecture seule** sur `oeuvres` (filtré `statut = publié`), `categories`, `recommandations`, `directus_files`.
2. Crée un utilisateur (ex. `build@arpeteria.fr`) rattaché à ce rôle, ou attache directement un token statique à un utilisateur existant restreint à ce rôle (**Utilisateurs → [utilisateur] → Token**).
3. Copie le token généré.

Ajoute-le dans `.env` :

```bash
nano .env   # DIRECTUS_STATIC_TOKEN=le_token_copié
```

## Étape 12 — Construire et démarrer le site

```bash
CACHEBUST=$(date +%s) docker compose up -d --build web
docker compose ps
```

> ⚠️ Toujours préfixer par `CACHEBUST=$(date +%s)` (voir `Dockerfile`/`docker-compose.yml`) : le
> build interroge Directus pour générer les pages, mais Docker ne le sait pas — sans ce préfixe,
> tant qu'aucun fichier du repo n'a changé, Docker réutilise la couche de cache du build précédent
> et **ressert l'ancien contenu**, même après avoir publié une nouvelle œuvre dans Directus.

Vérifie que tout tourne :

```bash
curl -I https://arpeteria.fr
curl -I https://admin.arpeteria.fr
```

Les deux doivent répondre `200 OK` (ou `301`/`302` selon la config) avec un certificat HTTPS valide.

## Étape 13 — Publier une première œuvre et mettre à jour le site

Sans l'automatisation de l'Étape 13bis, chaque publication nécessite un rebuild manuel du site :

1. Le conservateur crée/publie une œuvre dans `https://admin.arpeteria.fr`.
2. Sur le VPS :
   ```bash
   cd ~/arpeteria
   CACHEBUST=$(date +%s) docker compose up -d --build web
   ```

## Étape 13bis — Automatiser le rebuild (recommandé)

Un petit service (`scripts/rebuild-webhook.mjs`) tourne sur le VPS et relance le build du site
dès qu'un Flow Directus l'appelle — plus besoin de taper la commande manuellement à chaque
publication.

**1. Génère un secret et configure `.env` :**

```bash
openssl rand -hex 32   # → REBUILD_WEBHOOK_TOKEN
nano .env              # REBUILD_WEBHOOK_TOKEN=... (REBUILD_WEBHOOK_PORT=9002 par défaut, OK à garder)
```

**2. Installe le service en tant que service systemd** (redémarre tout seul, y compris après un reboot du VPS) :

```bash
sudo cp infra/systemd/arpeteria-rebuild-webhook.service /etc/systemd/system/
sudo nano /etc/systemd/system/arpeteria-rebuild-webhook.service   # ajuste User=/WorkingDirectory= si besoin
sudo systemctl daemon-reload
sudo systemctl enable --now arpeteria-rebuild-webhook
sudo systemctl status arpeteria-rebuild-webhook   # doit être "active (running)"
```

> ⚠️ Ne pas ouvrir ce port (9002) dans `ufw` : il ne doit être joignable que depuis le réseau
> Docker interne (le conteneur `directus`), jamais depuis l'extérieur. Le jeton dans l'en-tête
> `Authorization` reste une protection supplémentaire, mais inutile de l'exposer publiquement.

**3. Recrée `directus`** pour qu'il puisse joindre le service via `host.docker.internal` :

```bash
docker compose up -d directus
```

**4. Crée le Flow dans Directus** (**Paramètres → Flows → Créer un flow**) :

- **Déclencheur** : "Event Hook" → Type **"Action (Non-Blocking)"** → Actions : `items.create`,
  `items.update`, `items.delete` (ajoute aussi `items.promote`/`items.sort` si tu veux réordonner
  sans republier manuellement) → Collections : `oeuvres`, `categories`, `recommandations`.
- **Opération** : "Webhook / Request URL" → Méthode `POST` → URL exactement
  `http://host.docker.internal:9002/rebuild` (⚠️ pas d'espace avant/après, un espace en trop suffit
  à faire échouer la requête en 404).
  → Ajoute un header `Authorization`. Dans le champ **valeur** de ce header, tape le mot
  **`Bearer`**, un espace, puis le token — soit exactement (en remplaçant par ton propre token) :
  ```
  Bearer 93037fd17d8fbe54802dfa94afdd8c20507e282610f5396f2f7f926ae5a96cbe
  ```
  ⚠️ Piège fréquent : mettre uniquement le token sans le préfixe `Bearer ` devant → le service
  répond alors `401 Unauthorized` / `Token invalide`, alors même que le token est correct.
- Active le flow.

Pour vérifier que tout est bon en une commande, avant même de passer par l'UI Directus :
```bash
curl -i -X POST http://127.0.0.1:9002/rebuild -H "Authorization: Bearer $(grep REBUILD_WEBHOOK_TOKEN .env | cut -d= -f2)"
```
Doit répondre `202 Accepted`.

**5. Teste** : publie/modifie une œuvre, puis observe les logs du service pendant qu'il rebuild :

```bash
journalctl -u arpeteria-rebuild-webhook -f
```

Le site doit se mettre à jour tout seul après ~30-60 secondes, sans commande manuelle.

## Étape 14 — Sauvegardes

Dump quotidien de la base + archive du volume des fichiers uploadés (PDF, images), conservés 30 jours localement :

```bash
mkdir -p ~/backups
crontab -e
```

Ajoute :

```cron
0 3 * * * cd ~/arpeteria && docker compose exec -T database pg_dump -U $(grep DB_USER .env | cut -d= -f2) $(grep DB_DATABASE .env | cut -d= -f2) | gzip > ~/backups/db-$(date +\%F).sql.gz && docker run --rm -v arpeteria_directus_uploads:/data -v ~/backups:/backup alpine tar czf /backup/uploads-$(date +\%F).tar.gz -C /data . && find ~/backups -mtime +30 -delete
```

> ⚠️ C'est une sauvegarde **locale** (même machine). Pour respecter la règle 3-2-1 (voir [ARCHITECTURE.md §9](../ARCHITECTURE.md#9-sauvegardes--pérennité)), configure en plus une synchronisation vers un stockage externe (ex. `rclone` vers Scaleway Object Storage) — pas encore scripté dans ce repo, à mettre en place selon le stockage choisi.

## Étape 15 — Maintenance courante

```bash
# Logs
docker compose logs -f [service]

# Mettre à jour le code
git pull
CACHEBUST=$(date +%s) docker compose up -d --build web

# Mettre à jour les images Docker (Directus, Postgres, Caddy)
docker compose pull
docker compose up -d

# Espace disque utilisé par Docker
docker system df
```

---

## Dépannage rapide

| Symptôme | Piste |
|----------|-------|
| Caddy ne délivre pas de certificat HTTPS | Vérifier que le DNS pointe bien vers le VPS (`dig +short arpeteria.fr`) et que les ports 80/443 sont ouverts (`sudo ufw status`) |
| `docker compose up` échoue sur `web` (build) | Vérifier `DIRECTUS_STATIC_TOKEN` non vide dans `.env`, et que Directus tourne (`docker compose ps`) |
| Le site est en ligne mais vide | Normal tant qu'aucune œuvre n'est publiée + reconstruite (voir Étape 13) |
| `npm run bootstrap` échoue en `ECONNREFUSED` | Soit Directus n'est pas encore démarré/prêt (relancer `docker compose logs directus`, réessayer une fois "Server started" affiché), soit `DIRECTUS_ADMIN_URL` utilise `localhost` au lieu de `127.0.0.1` dans `.env` (Node résout `localhost` en `::1` sur Debian, non publié par Docker) |
| `password authentication failed for user` dans les logs `directus` après un `docker compose down` (sans `-v`) puis `up` avec un `.env` modifié | Le volume `pgdata` garde l'ancien mot de passe (Postgres ne le change qu'à la toute première initialisation). Soit tu remets l'ancien `DB_PASSWORD`, soit `docker compose down -v` pour repartir sur un volume neuf cohérent avec le nouveau `.env` |
| `docker compose up --build` échoue avec `network mode "web" not supported by buildkit` | Le build de `web` doit utiliser `network: host` (déjà configuré dans `docker-compose.yml`), pas un réseau bridge personnalisé — BuildKit ne le supporte pas. Si l'erreur persiste après un `git pull`, vérifie que `docker-compose.yml` contient bien `network: host` pour le service `web` |
| Une œuvre publiée dans Directus n'apparaît pas sur le site après `docker compose up -d --build web` | Docker a réutilisé le cache du build précédent (aucun fichier du repo n'a changé, donc `RUN npm run build` n'a pas été relancé). Toujours préfixer par `CACHEBUST=$(date +%s)` (voir Étape 12) |
| Le rebuild automatique (Étape 13bis) échoue en `404` dans le log d'exécution du Flow | Espace en trop dans le champ URL de l'opération webhook (`.../rebuild ` au lieu de `.../rebuild`) |
| Le rebuild automatique (Étape 13bis) échoue en `401` / `Token invalide` dans le log d'exécution du Flow | Le header `Authorization` du Flow ne contient que le token, sans le préfixe `Bearer ` devant — la valeur doit être `Bearer <token>` |
| Le rebuild automatique (Étape 13bis) ne se déclenche pas du tout (aucune entrée dans le log du Flow) | Vérifie dans l'ordre : `systemctl status arpeteria-rebuild-webhook` (doit être actif), `docker compose up -d directus` a bien été relancé après l'ajout d'`extra_hosts`, et que le Flow est bien activé et scope sur `oeuvres`/`categories`/`recommandations` |
| Erreur de connexion admin Directus | Vérifier `DIRECTUS_ADMIN_EMAIL`/`DIRECTUS_ADMIN_PASSWORD` dans `.env`, redémarrer avec `docker compose up -d directus` |
