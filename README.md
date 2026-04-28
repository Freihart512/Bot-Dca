# Bot-Dca

Monorepo del bot spot DCA + TP (API, worker, core de dominio, adapters).

## Tests

- `pnpm test` — todos los paquetes vía Turborepo (Vitest donde está configurado).
- `pnpm -C packages/core test` — solo `packages/core`.
- `pnpm -C apps/api test` — solo `apps/api`.

Comandos de calidad habituales: `pnpm lint`, `pnpm typecheck`, `pnpm build`.
