/**
 * Crée les collections Directus décrites dans ARCHITECTURE.md §5 si elles n'existent pas déjà.
 * Idempotent : peut être relancé sans dupliquer ni écraser le schéma existant.
 *
 * Usage : npm run bootstrap   (depuis scripts/, après `docker compose up`)
 *
 * Une fois le schéma posé, exporte-le dans le repo avec :
 *   npx directus schema snapshot ../cms/snapshot/schema.yaml
 */
import {
  directusRequest,
  collectionExists,
  fieldExists,
  relationExists,
} from './lib/directus-client.ts';

interface FieldDef {
  field: string;
  type: string;
  meta?: Record<string, unknown>;
  schema?: Record<string, unknown>;
}

interface CollectionDef {
  collection: string;
  icon: string;
  fields: FieldDef[];
}

interface RelationDef {
  collection: string;
  field: string;
  related_collection: string;
}

const PRIMARY_KEY_FIELD: FieldDef = {
  field: 'id',
  type: 'uuid',
  meta: { hidden: true, readonly: true, interface: 'input', special: ['uuid'] },
  schema: { is_primary_key: true, has_auto_increment: false },
};

// Champs partagés par les nouvelles collections éditoriales (articles/personnages/lieux),
// sur le même modèle que oeuvres/categories.
const STATUT_FIELD: FieldDef = {
  field: 'statut',
  type: 'string',
  meta: {
    interface: 'select-dropdown',
    required: true,
    options: {
      choices: [
        { text: 'Brouillon', value: 'brouillon' },
        { text: 'Publié', value: 'publié' },
      ],
    },
  },
  schema: { default_value: 'brouillon' },
};

function SLUG_FIELD(exemple: string): FieldDef {
  return {
    field: 'slug',
    type: 'string',
    meta: {
      interface: 'input',
      required: true,
      options: { slug: true, trim: true },
      validation: { slug: { _regex: '^[a-z0-9]+(-[a-z0-9]+)*$' } },
      validation_message: `Lettres minuscules, chiffres et tirets uniquement (ex. ${exemple}).`,
    },
    schema: { is_unique: true },
  };
}

const DATE_PUBLICATION_FIELD: FieldDef = {
  field: 'date_publication',
  type: 'timestamp',
  meta: { interface: 'datetime', readonly: true, hidden: true, special: ['date-created'] },
};

const MOTS_CLES_FIELD: FieldDef = {
  field: 'mots_cles',
  type: 'json',
  meta: { interface: 'tags', special: ['cast-json'] },
};

const collections: CollectionDef[] = [
  {
    collection: 'categories',
    icon: 'bookmark',
    fields: [
      { field: 'nom', type: 'string', meta: { interface: 'input', required: true } },
      {
        field: 'slug',
        type: 'string',
        meta: {
          interface: 'input',
          required: true,
          options: { slug: true, trim: true },
          validation: { slug: { _regex: '^[a-z0-9]+(-[a-z0-9]+)*$' } },
          validation_message: 'Lettres minuscules, chiffres et tirets uniquement (ex. periode-medievale).',
        },
        schema: { is_unique: true },
      },
      {
        field: 'section',
        type: 'string',
        meta: {
          interface: 'select-dropdown',
          required: true,
          options: {
            choices: [
              { text: 'Archives', value: 'archives' },
              { text: 'Contemporain', value: 'contemporain' },
            ],
          },
        },
      },
      {
        field: 'ordre',
        type: 'integer',
        meta: { interface: 'input' },
        schema: { default_value: 0 },
      },
      { field: 'description', type: 'text', meta: { interface: 'input-multiline' } },
      {
        field: 'image',
        type: 'uuid',
        meta: { interface: 'file-image', special: ['file'] },
      },
    ],
  },
  {
    collection: 'oeuvres',
    icon: 'auto_stories',
    fields: [
      {
        field: 'statut',
        type: 'string',
        meta: {
          interface: 'select-dropdown',
          required: true,
          options: {
            choices: [
              { text: 'Brouillon', value: 'brouillon' },
              { text: 'Publié', value: 'publié' },
            ],
          },
        },
        schema: { default_value: 'brouillon' },
      },
      { field: 'titre', type: 'string', meta: { interface: 'input', required: true } },
      {
        field: 'slug',
        type: 'string',
        meta: {
          interface: 'input',
          required: true,
          options: { slug: true, trim: true },
          validation: { slug: { _regex: '^[a-z0-9]+(-[a-z0-9]+)*$' } },
          validation_message: 'Lettres minuscules, chiffres et tirets uniquement (ex. savoyard-ou-savoisien).',
        },
        schema: { is_unique: true },
      },
      { field: 'auteur', type: 'string', meta: { interface: 'input' } },
      { field: 'description', type: 'text', meta: { interface: 'input-rich-text-html' } },
      {
        field: 'section',
        type: 'string',
        meta: {
          interface: 'select-dropdown',
          required: true,
          options: {
            choices: [
              { text: 'Archives', value: 'archives' },
              { text: 'Contemporain', value: 'contemporain' },
            ],
          },
        },
      },
      {
        field: 'categorie',
        type: 'uuid',
        meta: { interface: 'select-dropdown-m2o', special: ['m2o'] },
      },
      {
        field: 'type_media',
        type: 'string',
        meta: {
          interface: 'select-dropdown',
          required: true,
          options: {
            choices: [
              { text: 'PDF', value: 'pdf' },
              { text: 'Vidéo', value: 'video' },
              { text: 'Audio', value: 'audio' },
              { text: 'Lien', value: 'lien' },
            ],
          },
        },
      },
      { field: 'fichier_pdf', type: 'uuid', meta: { interface: 'file', special: ['file'] } },
      {
        field: 'url_externe',
        type: 'string',
        meta: { interface: 'input', options: { placeholder: 'https://…' } },
      },
      {
        field: 'couverture',
        type: 'uuid',
        meta: { interface: 'file-image', special: ['file'] },
      },
      {
        field: 'langue',
        type: 'string',
        meta: {
          interface: 'select-dropdown',
          options: {
            choices: [
              { text: 'Français', value: 'fr' },
              { text: 'Arpitan / savoyard', value: 'frp' },
              { text: 'Occitan', value: 'oc' },
              { text: 'Latin', value: 'la' },
            ],
          },
        },
        schema: { default_value: 'fr' },
      },
      {
        field: 'date_oeuvre',
        type: 'string',
        meta: { interface: 'input', options: { placeholder: 'ex : vers 1846' } },
      },
      {
        field: 'date_publication',
        type: 'timestamp',
        meta: { interface: 'datetime', readonly: true, hidden: true, special: ['date-created'] },
      },
      { field: 'mots_cles', type: 'json', meta: { interface: 'tags', special: ['cast-json'] } },
    ],
  },
  {
    collection: 'recommandations',
    icon: 'link',
    fields: [
      { field: 'nom_site', type: 'string', meta: { interface: 'input', required: true } },
      {
        field: 'url',
        type: 'string',
        meta: { interface: 'input', required: true, options: { placeholder: 'https://…' } },
      },
      { field: 'description', type: 'text', meta: { interface: 'input-multiline' } },
      {
        field: 'ordre',
        type: 'integer',
        meta: { interface: 'input' },
        schema: { default_value: 0 },
      },
    ],
  },
  {
    // Billets éditoriaux du conservateur (annonces, contexte historique, carnets de
    // recherche) — distinct d'une "œuvre" cataloguée : pas de fichier/média associé, juste
    // du texte long, à la manière d'un blog/actualités.
    collection: 'articles',
    icon: 'article',
    fields: [
      STATUT_FIELD,
      { field: 'titre', type: 'string', meta: { interface: 'input', required: true } },
      SLUG_FIELD('savoyard-ou-savoisien'),
      {
        field: 'chapo',
        type: 'text',
        meta: {
          interface: 'input-multiline',
          note: "Court résumé affiché dans les listes, avant le contenu complet de l'article.",
        },
      },
      { field: 'contenu', type: 'text', meta: { interface: 'input-rich-text-html', required: true } },
      { field: 'image', type: 'uuid', meta: { interface: 'file-image', special: ['file'] } },
      DATE_PUBLICATION_FIELD,
      MOTS_CLES_FIELD,
    ],
  },
  {
    // Fiches biographiques de figures savoyardes (autrices/auteurs, personnalités
    // historiques ou contemporaines liées à la culture arpitane).
    collection: 'personnages',
    icon: 'person',
    fields: [
      STATUT_FIELD,
      { field: 'nom', type: 'string', meta: { interface: 'input', required: true } },
      SLUG_FIELD('bernard-de-menthon'),
      {
        field: 'periode',
        type: 'string',
        meta: { interface: 'input', options: { placeholder: 'ex : 1675-1730, ou XIXe siècle' } },
      },
      { field: 'profession', type: 'string', meta: { interface: 'input', options: { placeholder: 'ex : Écrivain, Duc de Savoie…' } } },
      { field: 'portrait', type: 'uuid', meta: { interface: 'file-image', special: ['file'] } },
      { field: 'biographie', type: 'text', meta: { interface: 'input-rich-text-html' } },
      DATE_PUBLICATION_FIELD,
      MOTS_CLES_FIELD,
    ],
  },
  {
    // Lieux patrimoniaux (châteaux, villages, monuments) — troisième porte d'entrée dans
    // le fonds, aux côtés du temps (Archives) et de la discipline (Contemporain).
    collection: 'lieux',
    icon: 'castle',
    fields: [
      STATUT_FIELD,
      { field: 'nom', type: 'string', meta: { interface: 'input', required: true } },
      SLUG_FIELD('chateau-de-chambery'),
      { field: 'commune', type: 'string', meta: { interface: 'input', options: { placeholder: 'ex : Chambéry' } } },
      {
        field: 'periode',
        type: 'string',
        meta: { interface: 'input', options: { placeholder: 'ex : Moyen Âge, XIXe siècle…' } },
      },
      { field: 'description', type: 'text', meta: { interface: 'input-rich-text-html' } },
      { field: 'photo', type: 'uuid', meta: { interface: 'file-image', special: ['file'] } },
      DATE_PUBLICATION_FIELD,
      MOTS_CLES_FIELD,
    ],
  },
];

const relations: RelationDef[] = [
  { collection: 'oeuvres', field: 'categorie', related_collection: 'categories' },
  { collection: 'oeuvres', field: 'fichier_pdf', related_collection: 'directus_files' },
  { collection: 'oeuvres', field: 'couverture', related_collection: 'directus_files' },
  { collection: 'categories', field: 'image', related_collection: 'directus_files' },
  { collection: 'articles', field: 'image', related_collection: 'directus_files' },
  { collection: 'personnages', field: 'portrait', related_collection: 'directus_files' },
  { collection: 'lieux', field: 'photo', related_collection: 'directus_files' },
];

async function ensureCollection(def: CollectionDef) {
  if (await collectionExists(def.collection)) {
    console.log(`↷ collection "${def.collection}" existe déjà`);
  } else {
    await directusRequest('/collections', {
      method: 'POST',
      body: JSON.stringify({
        collection: def.collection,
        meta: { icon: def.icon },
        schema: {},
        fields: [PRIMARY_KEY_FIELD],
      }),
    });
    console.log(`✓ collection "${def.collection}" créée`);
  }

  // +2 pour laisser le rang 1 à la clé primaire (créée à part, ci-dessus).
  for (const [index, field] of def.fields.entries()) {
    const sort = index + 2;

    if (await fieldExists(def.collection, field.field)) {
      // Répare les champs créés par une exécution précédente : sans `sort` explicite,
      // Directus les laisse à `sort: null`, et l'écran "Créer un élément" les considère
      // hors du formulaire principal (message "Empty Form"), alors qu'ils existent bien
      // dans le schéma. Un simple PATCH du tri suffit à les faire réapparaître.
      await directusRequest(`/fields/${def.collection}/${field.field}`, {
        method: 'PATCH',
        body: JSON.stringify({ meta: { sort } }),
      });
      console.log(`  ↷ champ "${def.collection}.${field.field}" existe déjà (tri corrigé)`);
      continue;
    }
    await directusRequest(`/fields/${def.collection}`, {
      method: 'POST',
      body: JSON.stringify({ ...field, meta: { ...field.meta, sort } }),
    });
    console.log(`  ✓ champ "${def.collection}.${field.field}" créé`);
  }
}

async function ensureRelation(def: RelationDef) {
  if (await relationExists(def.collection, def.field)) {
    console.log(`↷ relation "${def.collection}.${def.field}" existe déjà`);
    return;
  }
  await directusRequest('/relations', {
    method: 'POST',
    body: JSON.stringify(def),
  });
  console.log(`✓ relation "${def.collection}.${def.field}" → "${def.related_collection}" créée`);
}

async function main() {
  for (const def of collections) {
    await ensureCollection(def);
  }
  for (const def of relations) {
    await ensureRelation(def);
  }
  console.log('\nSchéma Directus prêt. Pense à exporter le snapshot :');
  console.log('  npx directus schema snapshot ../cms/snapshot/schema.yaml');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
