FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG DIRECTUS_URL
ARG DIRECTUS_PUBLIC_URL
ARG DIRECTUS_STATIC_TOKEN
ENV DIRECTUS_URL=${DIRECTUS_URL}
ENV DIRECTUS_PUBLIC_URL=${DIRECTUS_PUBLIC_URL}
ENV DIRECTUS_STATIC_TOKEN=${DIRECTUS_STATIC_TOKEN}
# `npm run build` interroge Directus pour générer les pages statiques : son résultat dépend du
# contenu de la base, pas seulement du code source. Sans cet ARG, Docker réutilise la couche de
# cache de ce `RUN` tant qu'aucun fichier du repo n'a changé — donc publier une œuvre dans
# Directus puis relancer `docker compose up -d --build web` ne referait PAS le build (site
# resservi tel quel). CACHEBUST doit changer à chaque publication (voir docs/deploiement.md).
ARG CACHEBUST=1
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/dist /usr/share/caddy
