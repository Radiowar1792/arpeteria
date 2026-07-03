#!/usr/bin/env bash
set -euo pipefail

# Contourne un bug de bootstrap observé sur Directus 11.17.4 : au tout premier
# démarrage du conteneur (création de l'utilisateur admin via
# DIRECTUS_ADMIN_EMAIL/DIRECTUS_ADMIN_PASSWORD), le rôle "Administrator" créé
# n'est pas toujours relié à la policy "Administrator" (admin_access = true)
# dans la table de jointure directus_access. Résultat : l'admin s'authentifie
# normalement mais se prend un 403 sur tout (y compris /collections), car
# Directus n'accorde plus aucune permission via le rôle seul depuis les
# "policies" (v10.10+) — il faut qu'une policy admin_access=true soit
# effectivement rattachée.
#
# Ce script force ce lien directement en base, de façon idempotente (relançable
# sans créer de doublon), puis redémarre Directus pour vider son cache de
# permissions en mémoire (CACHE_STORE=memory dans docker-compose.yml).
#
# Usage (depuis la racine du repo, sur le serveur, une fois
# `docker compose up -d database directus caddy` fait et Directus démarré) :
#   ./scripts/fix-directus-admin-access.sh

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Erreur : .env introuvable à la racine du repo." >&2
  exit 1
fi

DB_USER=$(grep '^DB_USER=' .env | cut -d= -f2-)
DB_DATABASE=$(grep '^DB_DATABASE=' .env | cut -d= -f2-)
ADMIN_EMAIL=$(grep '^DIRECTUS_ADMIN_EMAIL=' .env | cut -d= -f2-)

if [ -z "$DB_USER" ] || [ -z "$DB_DATABASE" ] || [ -z "$ADMIN_EMAIL" ]; then
  echo "Erreur : DB_USER, DB_DATABASE ou DIRECTUS_ADMIN_EMAIL manquant dans .env." >&2
  exit 1
fi

docker compose exec -T database psql -U "$DB_USER" -d "$DB_DATABASE" <<SQL
DO \$\$
DECLARE
  v_policy_id uuid;
  v_role_id uuid;
BEGIN
  SELECT id INTO v_policy_id FROM directus_policies WHERE admin_access = true LIMIT 1;
  SELECT role INTO v_role_id FROM directus_users WHERE email = '$ADMIN_EMAIL' LIMIT 1;

  IF v_policy_id IS NULL THEN
    RAISE EXCEPTION 'Aucune policy avec admin_access=true trouvée dans directus_policies';
  END IF;
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Aucun rôle trouvé pour l''utilisateur %', '$ADMIN_EMAIL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM directus_access WHERE role = v_role_id AND policy = v_policy_id
  ) THEN
    RAISE NOTICE 'Policy admin déjà attachée au rôle % — rien à faire', v_role_id;
  ELSE
    INSERT INTO directus_access (id, role, policy, sort)
    VALUES (gen_random_uuid(), v_role_id, v_policy_id, 1);
    RAISE NOTICE 'Policy % attachée au rôle %', v_policy_id, v_role_id;
  END IF;
END \$\$;
SQL

echo "Redémarrage de Directus pour vider le cache de permissions en mémoire..."
docker compose restart directus

echo "OK. Attends que Directus soit prêt (\`docker compose logs -f directus\`, Ctrl+C sur \"Server started\"), puis relance le bootstrap :"
echo "  cd scripts && npm run bootstrap && npm run seed"
