#!/usr/bin/env node
/**
 * Petit serveur HTTP sans dépendance : reçoit un webhook (déclenché par un Flow Directus
 * sur création/modification/suppression d'oeuvres, categories ou recommandations) et relance
 * `docker compose up -d --build web` avec un CACHEBUST frais, pour que le site statique reflète
 * le nouveau contenu sans intervention manuelle.
 *
 * Usage : node scripts/rebuild-webhook.mjs   (voir docs/deploiement.md pour le service systemd)
 */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
config({ path: path.join(REPO_ROOT, '.env') });

const TOKEN = process.env.REBUILD_WEBHOOK_TOKEN;
const PORT = Number(process.env.REBUILD_WEBHOOK_PORT ?? 9002);

if (!TOKEN) {
  throw new Error('REBUILD_WEBHOOK_TOKEN doit être défini dans .env (voir .env.example).');
}

let enCours = false;
let rejoue = false;

function lancerBuild() {
  if (enCours) {
    rejoue = true;
    console.log('[rebuild-webhook] build déjà en cours, sera relancé à la suite');
    return;
  }
  enCours = true;
  const horodatage = new Date().toISOString();
  console.log(`[rebuild-webhook] ${horodatage} : lancement du build web`);

  const child = spawn('docker', ['compose', 'up', '-d', '--build', 'web'], {
    cwd: REPO_ROOT,
    env: { ...process.env, CACHEBUST: String(Date.now()) },
    stdio: 'inherit',
  });

  child.on('exit', (code) => {
    enCours = false;
    console.log(`[rebuild-webhook] build terminé (code ${code})`);
    if (rejoue) {
      rejoue = false;
      lancerBuild();
    }
  });

  child.on('error', (err) => {
    enCours = false;
    console.error('[rebuild-webhook] échec du lancement de docker compose :', err);
  });
}

const serveur = createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/rebuild') {
    res.writeHead(404).end();
    return;
  }

  const auth = req.headers.authorization;
  if (auth !== `Bearer ${TOKEN}`) {
    res.writeHead(401).end('Token invalide');
    return;
  }

  res.writeHead(202).end('Rebuild programmé');
  lancerBuild();
});

serveur.listen(PORT, () => {
  console.log(`[rebuild-webhook] en écoute sur le port ${PORT}`);
});
