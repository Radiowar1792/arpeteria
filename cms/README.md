# cms — Configuration Directus

Ce dossier ne contient **que de la configuration versionnée**. Directus lui-même tourne depuis l'image Docker officielle (`directus/directus:11`), rien n'est forké ici.

- `snapshot/schema.yaml` — snapshot du modèle de données, à régénérer après toute modification de collections/champs dans l'interface admin :
  ```bash
  npx directus schema snapshot ./cms/snapshot/schema.yaml
  ```
  et à appliquer sur une autre instance avec :
  ```bash
  npx directus schema apply ./cms/snapshot/schema.yaml
  ```
- `flows/` — documentation des Flows Directus (ex : webhook de rebuild à la publication).
- `extensions/` — extensions Directus custom éventuelles (vide au départ).
