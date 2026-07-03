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
docker compose up -d --build web
docker compose ps
```

Vérifie que tout tourne :

```bash
curl -I https://arpeteria.fr
curl -I https://admin.arpeteria.fr
```

Les deux doivent répondre `200 OK` (ou `301`/`302` selon la config) avec un certificat HTTPS valide.

## Étape 13 — Publier une première œuvre et mettre à jour le site

Tant que l'automatisation (Flow Directus → CI/CD, prévue en Phase 3) n'est pas en place, chaque publication nécessite un rebuild manuel du site :

1. Le conservateur crée/publie une œuvre dans `https://admin.arpeteria.fr`.
2. Sur le VPS :
   ```bash
   cd ~/arpeteria
   docker compose up -d --build web
   ```

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
docker compose up -d --build web

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
| `docker compose up --build` échoue avec `network mode "web" not supported by buildkit` | Le build de `web` doit utiliser `network: host` (déjà configuré dans `docker-compose.yml`), pas un réseau bridge personnalisé — BuildKit ne le supporte pas. Si l'erreur persiste après un `git pull`, vérifie que `docker-compose.yml` contient bien `network: host` pour le service `web` |
| Erreur de connexion admin Directus | Vérifier `DIRECTUS_ADMIN_EMAIL`/`DIRECTUS_ADMIN_PASSWORD` dans `.env`, redémarrer avec `docker compose up -d directus` |
