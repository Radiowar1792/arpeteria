# infra — Infrastructure

- `caddy/Caddyfile` — routage `arpeteria.fr` (site statique) / `admin.arpeteria.fr` (Directus), HTTPS automatique.
- `backup/backup.sh` — dump PostgreSQL quotidien + archivage du volume `directus_uploads` (les PDF) vers un stockage externe. Voir la règle 3-2-1 dans [../ARCHITECTURE.md](../ARCHITECTURE.md#9-sauvegardes--pérennité).
