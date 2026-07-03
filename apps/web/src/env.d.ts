/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly DIRECTUS_URL: string;
  readonly DIRECTUS_PUBLIC_URL?: string;
  readonly DIRECTUS_STATIC_TOKEN?: string;
  readonly PUBLIC_UMAMI_URL?: string;
  readonly PUBLIC_UMAMI_WEBSITE_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
