# Playground for strapi-cache plugin

to start redis standalone:

```bash
docker compose -f redis-standalone.docker-compose.yml up -d
```

to start redis cluster:

```bash
docker compose -f redis-cluster.docker-compose.yml up -d
```

## Development

in root run:

```bash
npm run watch:link
```

then in this playground folder run:

```bash
npx yalc add strapi-cache && npx yalc link strapi-cache && npm install && npm run dev
```
