# Backlog técnico ejecutable — BOT Spot DCA + TP
_Fuentes únicas de verdad:_ PRD_Bot_Trading_Spot_DCA_TP.md · adr_bot_trading_spot_final.md · BACKLOG FUNCIONAL — BOT SPOT DCA + TP.md  
_Reglas:_ tareas atómicas, trazabilidad obligatoria US/UC, sin scope extra.

---

## Notas de orden de ejecución (léelas antes de arrancar)

### 1) Cómo ejecutar este backlog sin romper dependencias
- **Sigue el orden de secciones** tal cual. Cada sección desbloquea la siguiente.
- Dentro de cada sección, ejecuta tareas en orden TECH-XXX.
- No “adelantes” engine/worker si aún no existe:
  - **VOs + puertos** (core)  
  - **schema + repos** (infra-db)  
  - **exchange adapter** (infra-exchange-binance)  
  - **loop + idempotencia + acciones** (worker)

### 2) Reglas duras durante implementación
- **Core (`packages/core`) no importa nada de infraestructura** (DB/Binance/Telegram/NestJS).
- **Infra implementa ports** y solo infra hace IO.
- **Idempotencia primero**: cualquier acción que coloque órdenes debe tener `idempotency_key` + `clientOrderId` determinista.
- **Transacciones por step** (persistencia consistente) y **locks** por bot para evitar doble ejecución.

### 3) Qué verificar al final de cada sección
- Repo/tooling: builds y lint corren.
- Core: unit tests de estrategia pasan.
- DB: migraciones + repos + locks pasan integration.
- Worker: ticks idempotentes, partial fills cancel remanente, TP resetea ciclo.
- API: endpoints control plane y /docs.
- Infra: compose local levanta todo y healthchecks pasan.
- CI: pipeline en green.

### 4) Secciones “peligrosas”
- **Locks + command bus**: si se hace mal, habrá doble ejecución y órdenes duplicadas.
- **Fills parciales**: promedio debe usar SOLO fills reales; remanente cancelado explícitamente.
- **Degraded mode**: WS down → polling sin parar el bot; notificar.

---

# 1) Repo & tooling init

> **Nota de ejecución:** TODO el tooling y gobierno del repo (lint, boundaries, PR template, CI) va aquí para que **cada PR desde el día 1** cumpla DoD.

### TECH-001 — Inicializar monorepo con pnpm workspaces + Turborepo
Trazabilidad:
- US-01
- UC-01
Contexto: El ADR fija monorepo pnpm + Turbo como base estructural.
Objetivo: Repo listo para apps/api + apps/worker + packages/* con build orchestration.
Pasos concretos:
- Crear `pnpm-workspace.yaml`
- Inicializar `turbo.json`
- Crear `apps/` y `packages/`
Criterios de aceptación:
- [ ] `pnpm -w install` funciona
- [ ] `pnpm -w turbo run build` ejecuta (aunque sea placeholder)
Artefactos esperados:
- `pnpm-workspace.yaml`
- `turbo.json`
- `apps/`, `packages/`
Tests requeridos:
- none

### TECH-002 — Configurar TypeScript base (tsconfig) y referencias por paquete
Trazabilidad:
- US-01
- UC-01
Contexto: Necesitamos compilación consistente en todo el monorepo.
Objetivo: Config TS base + tsconfig por app/paquete, con project references.
Pasos concretos:
- Crear `tsconfig.base.json`
- Crear `tsconfig.json` por app/paquete extendiendo base
- Habilitar `composite` donde aplique
Criterios de aceptación:
- [ ] `pnpm -w turbo run typecheck` pasa
Artefactos esperados:
- `tsconfig.base.json`
- `apps/**/tsconfig.json`
- `packages/**/tsconfig.json`
Tests requeridos:
- none

### TECH-003 — Configurar ESLint + Prettier para monorepo
Trazabilidad:
- US-01
- UC-01
Contexto: Enforcements y consistencia de estilo son obligatorios por ADR.
Objetivo: Lint/format funcional en apps y packages.
Pasos concretos:
- Agregar eslint config raíz
- Agregar prettier config
- Scripts `lint`, `format`, `typecheck`
Criterios de aceptación:
- [ ] `pnpm -w lint` corre en todo el repo
- [ ] `pnpm -w format` aplica sin errores
Artefactos esperados:
- `.eslintrc.*` o `eslint.config.*`
- `.prettierrc`
- `package.json` scripts
Tests requeridos:
- none

### TECH-004 — Enforcements de límites: eslint-plugin-boundaries + no-restricted-imports
Trazabilidad:
- US-01
- UC-01
Contexto: ADR exige límites estrictos entre core y adapters.
Objetivo: Bloquear imports ilegales entre capas/paquetes.
Pasos concretos:
- Configurar boundaries (core vs infra-* vs apps)
- Configurar no-restricted-imports para deep imports prohibidos
- Agregar reglas por glob (apps/api, apps/worker, packages/core, packages/infra-*)
Criterios de aceptación:
- [ ] Importar `packages/infra-*` desde `packages/core` falla el lint
- [ ] Importar `apps/*` desde `packages/*` falla el lint
Artefactos esperados:
- Config ESLint con `boundaries/*` y `no-restricted-imports`
Tests requeridos:
- none


### TECH-087 — DoD mínimo: checklist por PR (scope/US/UC + tests + lint)
Trazabilidad:
- US-01
- UC-01
Contexto: DoD evita scope creep.
Objetivo: Template de PR con trazabilidad obligatoria.
Pasos concretos:
- Crear `.github/pull_request_template.md`
- Incluir sección “Trazabilidad US/UC” + “tests” + “no scope change”
Criterios de aceptación:
- [ ] PR template aparece al abrir PR
Artefactos esperados:
- `.github/pull_request_template.md`
Tests requeridos:
- none


### TECH-086 — CI GitHub Actions: lint + typecheck + test (unit/integration/e2e) + build
Trazabilidad:
- US-01
- UC-01
Contexto: Calidad mínima para sostener el desarrollo.
Objetivo: Pipeline CI reproducible.
Pasos concretos:
- Workflow con jobs: install → lint → typecheck → test:unit → test:integration → test:e2e → build
- Levantar Postgres como service container para integration/e2e (o `docker compose` en job)
- Cache pnpm
Criterios de aceptación:
- [ ] PR corre CI y pasa en green
- [ ] CI ejecuta unit + integration + e2e
Artefactos esperados:
- `.github/workflows/ci.yml`
Tests requeridos:
- none

### TECH-005 — Convención de scripts monorepo (build/test/dev)
Trazabilidad:
- US-01
- UC-01
Contexto: Necesitamos comandos estándar para operar local/itg/prod.
Objetivo: Scripts consistentes para dev y CI.
Pasos concretos:
- Definir scripts raíz: `dev`, `build`, `test`, `lint`, `typecheck`
- Definir scripts por app/paquete según rol
Criterios de aceptación:
- [ ] `pnpm -w dev` levanta api+worker (aunque sea hello world)
Artefactos esperados:
- `package.json` (root) scripts
- `apps/*/package.json` scripts
Tests requeridos:
- none

---

# 2) Estructura base de carpetas + wiring base

> **Nota de ejecución:** aquí solo creas esqueletos y wiring. **No metas lógica de trading** todavía.

### TECH-006 — Crear esqueleto de `apps/api` (NestJS mínimo)
Trazabilidad:
- US-01
- UC-01
Contexto: ADR define API como control plane (sin lógica de trading).
Objetivo: API NestJS con health endpoint placeholder.
Pasos concretos:
- Inicializar NestJS app en `apps/api`
- Crear módulo raíz + controller health
- Exponer `/health`
Criterios de aceptación:
- [ ] `GET /health` responde 200
Artefactos esperados:
- `apps/api/src/main.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/health.controller.ts`
Tests requeridos:
- integration

### TECH-007 — Crear esqueleto de `apps/worker` (NestJS o bootstrap TS)
Trazabilidad:
- US-03
- UC-03
Contexto: ADR define worker 24/7 separado de API.
Objetivo: Worker ejecutable con loop placeholder.
Pasos concretos:
- Crear bootstrap de worker
- Crear “tick loop” placeholder (sin trading aún)
- Conectar a DB (placeholder)
Criterios de aceptación:
- [ ] `pnpm --filter worker dev` arranca y loguea “worker started”
Artefactos esperados:
- `apps/worker/src/main.ts`
- `apps/worker/src/worker.module.ts`
Tests requeridos:
- none

### TECH-008 — Crear `packages/core` con estructura domain/application
Trazabilidad:
- US-01
- UC-01
Contexto: ADR fija core puro: dominio + aplicación sin IO.
Objetivo: Paquete core compilable con exports controlados.
Pasos concretos:
- Crear `packages/core/src/domain/*`
- Crear `packages/core/src/application/*`
- Crear `packages/core/src/index.ts` (barrel)
Criterios de aceptación:
- [ ] `pnpm -w turbo run build` compila core
Artefactos esperados:
- `packages/core/src/domain`
- `packages/core/src/application`
- `packages/core/src/index.ts`
Tests requeridos:
- none

### TECH-009 — Crear packages de infraestructura: db / exchange-binance / notifications-telegram
Trazabilidad:
- US-01
- UC-01
Contexto: ADR fija adapters en `packages/infra-*`.
Objetivo: Paquetes creados y compilables (placeholder).
Pasos concretos:
- Crear `packages/infra-db`
- Crear `packages/infra-exchange-binance`
- Crear `packages/infra-notifications-telegram`
Criterios de aceptación:
- [ ] Cada paquete compila y exporta un módulo/factory placeholder
Artefactos esperados:
- `packages/infra-db/src/*`
- `packages/infra-exchange-binance/src/*`
- `packages/infra-notifications-telegram/src/*`
Tests requeridos:
- none

---

# 3) Shared / Core: tipos base, errores, VOs

> **Nota de ejecución:** esto define el “lenguaje” del dominio. Sin esto, todo lo demás queda inestable.

### TECH-010 — Definir errores base de dominio (DomainError) + códigos
Trazabilidad:
- US-01
- UC-01
Contexto: Core debe validar invariantes sin depender de infraestructura.
Objetivo: Errores tipados reutilizables en dominio/aplicación.
Pasos concretos:
- Crear `DomainError` y subtipos comunes
- Definir `code` y `message`
Criterios de aceptación:
- [ ] Errores pueden serializarse (code/message) sin stack requerido
Artefactos esperados:
- `packages/core/src/domain/errors/*`
Tests requeridos:
- unit

### TECH-011 — VO genérico: UUIDv7 (BotId, CycleId, OrderId, FillId)
Trazabilidad:
- US-01
- UC-01
Contexto: ADR exige UUIDv7 como ids.
Objetivo: Value Objects de ID con parse/validate.
Pasos concretos:
- Crear `UuidV7` VO
- Crear aliases: `BotId`, `CycleId`, `OrderId`, `FillId`, `CommandId`, `BusinessEventId`
Criterios de aceptación:
- [ ] Rechaza strings inválidos
- [ ] `toString()` estable
Artefactos esperados:
- `packages/core/src/domain/value-objects/uuidv7.ts`
- `packages/core/src/domain/value-objects/ids.ts`
Tests requeridos:
- unit

### TECH-012 — VO Money (stablecoin) + operaciones seguras
Trazabilidad:
- US-01
- UC-01
Contexto: PRD define capital en stablecoins y cálculos deterministas.
Objetivo: Money inmutable (amount + currency) con suma/resta/compare.
Pasos concretos:
- Crear `Money` con currency (USDT/USDC)
- Reglas: no mezclar currencies
- Operaciones: add/sub/mul/compare
Criterios de aceptación:
- [ ] Prohíbe currency distinta
- [ ] No usa floats (usar decimal string o bigint minor units)
Artefactos esperados:
- `packages/core/src/domain/value-objects/money.ts`
Tests requeridos:
- unit

### TECH-013 — VO Quantity (asset qty) + precisión
Trazabilidad:
- US-04
- UC-04
Contexto: Compras/ventas requieren qty exacta por fills.
Objetivo: VO `Quantity` con operaciones y formato.
Pasos concretos:
- Crear `Quantity` con decimal seguro
- add/sub/compare
Criterios de aceptación:
- [ ] No permite valores negativos
Artefactos esperados:
- `packages/core/src/domain/value-objects/quantity.ts`
Tests requeridos:
- unit

### TECH-014 — VO Price (precio spot) + comparadores
Trazabilidad:
- US-03
- UC-03
Contexto: Reglas usan comparaciones de precio vs referencia/promedio.
Objetivo: VO `Price` con compare/mul.
Pasos concretos:
- Crear `Price`
- Implementar `gte`, `lte`, `mulPercent`
Criterios de aceptación:
- [ ] Multiplicaciones por % no pierden precisión (según representación elegida)
Artefactos esperados:
- `packages/core/src/domain/value-objects/price.ts`
Tests requeridos:
- unit

### TECH-015 — Tipos de mercado permitidos (Pair, Asset) y validación PRD
Trazabilidad:
- US-01
- UC-01
Contexto: PRD restringe pares: BTC/ETH/BNB vs USDT/USDC.
Objetivo: Tipos y validación centralizada.
Pasos concretos:
- Crear enums/ADTs para `BaseAsset`, `QuoteAsset`, `TradingPair`
- Validar solo combos permitidos
Criterios de aceptación:
- [ ] Crear bot con par no permitido falla (DomainError)
Artefactos esperados:
- `packages/core/src/domain/value-objects/pair.ts`
Tests requeridos:
- unit

---

# 4) Dominio: entidades, agregados, invariantes, eventos

> **Nota de ejecución:** aquí modelas invariantes. Nada de DB/Binance/Telegram.

### TECH-016 — Modelar agregado Bot + estados del PRD
Trazabilidad:
- US-01
- UC-01
Contexto: PRD define estados (idle/active/no_cash/trapped/paused/completed/terminated).
Objetivo: Agregado Bot con transiciones válidas.
Pasos concretos:
- Definir `Bot` con `status`, `pair`, `initialCapital`, `totalCapital`, `realizedPnL`, `params`
- Implementar transiciones: create/start/pause/resume/inject/terminate
Criterios de aceptación:
- [ ] No permite iniciar si está terminated
- [ ] No permite reanudar si no está paused
Artefactos esperados:
- `packages/core/src/domain/aggregates/bot/*`
Tests requeridos:
- unit

### TECH-017 — Modelar entidad Cycle (ciclo DCA) + contadores de compras
Trazabilidad:
- US-04
- UC-04
Contexto: PRD define hasta 5 compras regulares + 1 extensión por ciclo.
Objetivo: Cycle con tracking de compras y referencia vigente.
Pasos concretos:
- Definir `Cycle` con `referencePrice`, `regularBuysCount`, `extensionUsed`, `avgPrice`, `positionQty`
- Reglas de “referencia dinámica antes de primera compra” vs “fija después”
Criterios de aceptación:
- [ ] No excede 5 compras regulares
- [ ] Solo 1 compra de extensión
Artefactos esperados:
- `packages/core/src/domain/entities/cycle/*`
Tests requeridos:
- unit

### TECH-018 — Definir dominio de Orders/Fills (para cálculo por fills reales)
Trazabilidad:
- US-06
- UC-06
Contexto: PRD/ADR definen promedio ponderado por fills reales; compras LIMIT GTC con fills parciales.
Objetivo: Modelo `Order` + `Fill` coherente con ADR.
Pasos concretos:
- Definir `Order` (intent, side, type, tif, clientOrderId, status)
- Definir `Fill` (qty, price, fee, timestamp)
- Enforce: fills 1..n por order
Criterios de aceptación:
- [ ] `Order` puede estar PARTIALLY_FILLED con fills >0
Artefactos esperados:
- `packages/core/src/domain/entities/order/*`
- `packages/core/src/domain/entities/fill/*`
Tests requeridos:
- unit

### TECH-019 — Eventos de negocio (BusinessEvent types) alineados a ADR notificaciones
Trazabilidad:
- US-14
- UC-14
Contexto: ADR define tabla append-only `business_events` + eventos notificados.
Objetivo: Tipos de eventos y payloads estables en core.
Pasos concretos:
- Definir `BusinessEventType` (BOT_STARTED, BUY_PLACED, BUY_FILLED_PARTIAL, REFERENCE_UPDATED, TP_EXECUTED, TRAPPED_ENTERED, DEGRADED_ON, etc.)
- Definir schema de payload (TS types)
Criterios de aceptación:
- [ ] Cada evento tiene `correlationId` e `idempotencyKey` definidos
Artefactos esperados:
- `packages/core/src/domain/events/*`
Tests requeridos:
- unit

---

# 5) Aplicación: puertos, casos de uso, servicios

> **Nota de ejecución:** primero puertos, luego use cases, luego servicios puros (StrategyEvaluator).

### TECH-020 — Definir puertos (interfaces) en core: BotRepositoryPort + CycleRepositoryPort
Trazabilidad:
- US-01
- UC-01
Contexto: Core no depende de DB; repos vía ports.
Objetivo: Interfaces de persistencia para bots/cycles/orders/fills/events/commands.
Pasos concretos:
- Crear `BotRepositoryPort`
- Crear `CycleRepositoryPort`
- Crear `OrderRepositoryPort`, `FillRepositoryPort`, `BusinessEventRepositoryPort`, `BotCommandRepositoryPort`
Criterios de aceptación:
- [ ] `packages/core` compila sin depender de Kysely/pg
Artefactos esperados:
- `packages/core/src/application/ports/*`
Tests requeridos:
- unit

### TECH-021 — Definir ExchangePort en core (tipos propios)
Trazabilidad:
- US-04
- UC-04
Contexto: ADR exige ExchangePort “medianamente grueso” + tipos propios.
Objetivo: Contrato de exchange para: precios, place/cancel orders, market sell TP, account balances.
Pasos concretos:
- Definir `ExchangePort` con:
  - `getCurrentPrice(pair)`
  - `placeLimitBuyGtc(intent)`
  - `cancelOrder(orderRef)`
  - `placeMarketSellAll(intent)`
  - `getBalances(quoteAsset/baseAsset)`
- Definir modelos `OrderIntent`, `OrderRef`, `ExchangeFill`
Criterios de aceptación:
- [ ] ExchangePort cubre compra LIMIT GTC + cancel remanente + venta MARKET
Artefactos esperados:
- `packages/core/src/application/ports/exchange.port.ts`
Tests requeridos:
- unit

### TECH-022 — Definir NotificationPort en core (Telegram via adapter)
Trazabilidad:
- US-14
- UC-14
Contexto: ADR fija Telegram desde el inicio.
Objetivo: Port para emitir notificaciones de eventos clave.
Pasos concretos:
- Definir `NotificationPort.notify(event)`
- Incluir `severity`/`category` si aplica
Criterios de aceptación:
- [ ] No depende de SDK Telegram en core
Artefactos esperados:
- `packages/core/src/application/ports/notification.port.ts`
Tests requeridos:
- unit

### TECH-023 — UC-01/US-01: Use case Crear Bot (validación PRD)
Trazabilidad:
- US-01
- UC-01
Contexto: Crear bot fija capital inicial, par permitido y params (X referencia dinámica).
Objetivo: Crear bot en estado `idle` con referencia inicial = precio al crear (PRD).
Pasos concretos:
- Implementar `CreateBotUseCase`
- Validar par permitido + stablecoin
- Persistir Bot + Cycle inicial (con referencia inicial)
Criterios de aceptación:
- [ ] Crea bot `idle` con `referencePrice` inicial
Artefactos esperados:
- `packages/core/src/application/use-cases/create-bot.usecase.ts`
Tests requeridos:
- unit

### TECH-024 — UC-02/US-02: Use case Iniciar Bot (sin lógica de trading en API)
Trazabilidad:
- US-02
- UC-02
Contexto: Iniciar cambia estado para que worker lo procese.
Objetivo: Transición a `active` + emisión de comando o señal para worker.
Pasos concretos:
- Implementar `StartBotUseCase`
- Persistir estado `active`
- Encolar `bot_command` START o equivalente
Criterios de aceptación:
- [ ] Bot pasa a `active` y existe comando pending
Artefactos esperados:
- `packages/core/src/application/use-cases/start-bot.usecase.ts`
Tests requeridos:
- unit

### TECH-025 — UC-09/US-09: Use case Pausar Bot
Trazabilidad:
- US-09
- UC-09
Contexto: PRD permite pausar; worker debe respetarlo.
Objetivo: Bot a `paused` + comando para worker (si aplica).
Pasos concretos:
- Implementar `PauseBotUseCase`
- Persistir `paused`
- Registrar evento de negocio
Criterios de aceptación:
- [ ] Worker no ejecuta trading si bot está `paused` (ver tests del engine)
Artefactos esperados:
- `packages/core/src/application/use-cases/pause-bot.usecase.ts`
Tests requeridos:
- unit

### TECH-026 — UC-10/US-10: Use case Reanudar Bot
Trazabilidad:
- US-10
- UC-10
Contexto: Reanudar regresa a operación.
Objetivo: Bot vuelve a `active`.
Pasos concretos:
- Implementar `ResumeBotUseCase`
- Persistir `active`
- Registrar evento de negocio
Criterios de aceptación:
- [ ] Bot `paused` → `active` solamente
Artefactos esperados:
- `packages/core/src/application/use-cases/resume-bot.usecase.ts`
Tests requeridos:
- unit

### TECH-027 — UC-11/US-11: Use case Inyectar Capital
Trazabilidad:
- US-11
- UC-11
Contexto: PRD permite inyectar capital operativo adicional.
Objetivo: Aumentar `totalCapital` sin tocar `initialCapital`.
Pasos concretos:
- Implementar `InjectCapitalUseCase`
- Validar currency stablecoin
- Registrar evento de negocio
Criterios de aceptación:
- [ ] `initialCapital` no cambia; `totalCapital` incrementa
Artefactos esperados:
- `packages/core/src/application/use-cases/inject-capital.usecase.ts`
Tests requeridos:
- unit

### TECH-028 — UC-13/US-13: Use case Finalizar Bot (terminate)
Trazabilidad:
- US-13
- UC-13
Contexto: PRD permite apagar definitivamente; worker debe parar.
Objetivo: Bot a `terminated` + comando STOP para worker.
Pasos concretos:
- Implementar `TerminateBotUseCase`
- Persistir `terminated`
- Registrar evento de negocio
Criterios de aceptación:
- [ ] Bot terminado no vuelve a active
Artefactos esperados:
- `packages/core/src/application/use-cases/terminate-bot.usecase.ts`
Tests requeridos:
- unit

### TECH-029 — Servicio de aplicación: Evaluación de estrategia por tick (sin IO)
Trazabilidad:
- US-04
- UC-04
Contexto: Worker trae precio; core decide acciones deterministas (buy/TP/ref update/trapped).
Objetivo: Función pura que dado estado+precio retorna “intents”.
Pasos concretos:
- Crear `StrategyEvaluator`
- Entradas: Bot+Cycle+precio_actual+balances
- Salidas: intents (update_reference / place_buy / place_extension / place_tp / mark_trapped / none)
Criterios de aceptación:
- [ ] No hace llamadas IO
Artefactos esperados:
- `packages/core/src/application/services/strategy-evaluator.ts`
Tests requeridos:
- unit

### TECH-030 — UC-03/US-03: Regla de referencia dinámica pre-compra
Trazabilidad:
- US-03
- UC-03
Contexto: PRD: antes de primera compra, si precio_actual >= referencia*(1+X) actualizar referencia.
Objetivo: Implementar intent `update_reference` y persistencia.
Pasos concretos:
- Implementar regla en `StrategyEvaluator`
- Crear handler `ApplyReferenceUpdate`
- Registrar evento `REFERENCE_UPDATED`
Criterios de aceptación:
- [ ] Solo aplica si no hay compras ejecutadas aún
Artefactos esperados:
- `packages/core/src/application/services/strategy-evaluator.ts` (actualización)
- `packages/core/src/application/handlers/apply-reference-update.ts`
Tests requeridos:
- unit

### TECH-031 — UC-04/US-04: Regla de compras regulares (5 niveles, % capital inicial)
Trazabilidad:
- US-04
- UC-04
Contexto: PRD: 5 compras regulares con porcentajes 10/12/14/16/18 sobre capital inicial; drop fijo desde referencia vigente.
Objetivo: Calcular tamaño de orden y condición de disparo por nivel.
Pasos concretos:
- Modelar config de niveles en core (consts)
- Implementar condición `precio_actual <= referencia * (1 - drop)` por nivel
- Calcular `Money` a usar según % de initialCapital
Criterios de aceptación:
- [ ] Nunca excede 5 compras regulares
- [ ] No excede 70% del capital inicial asignado en sumatoria nominal (según PRD)
Artefactos esperados:
- `packages/core/src/domain/strategy/dca-levels.ts`
- `packages/core/src/application/services/strategy-evaluator.ts`
Tests requeridos:
- unit

### TECH-032 — UC-05/US-05: Regla compra de extensión (−10% desde última compra regular)
Trazabilidad:
- US-05
- UC-05
Contexto: PRD: 1 compra extensión si cae −10% desde última compra regular; usa 100% del cash líquido.
Objetivo: Emitir intent `place_extension_buy` con monto = cash disponible.
Pasos concretos:
- Implementar condición (requiere última compra regular)
- Calcular monto = cash líquido (Money)
- Marcar `extensionUsed=true` si se ejecuta
Criterios de aceptación:
- [ ] Solo 1 por ciclo
- [ ] No usa referencia dinámica
Artefactos esperados:
- `packages/core/src/application/services/strategy-evaluator.ts`
Tests requeridos:
- unit

### TECH-033 — UC-06/US-06: Cálculo de precio promedio ponderado por fills reales
Trazabilidad:
- US-06
- UC-06
Contexto: PRD/ADR: promedio usa solo fills reales (incluye parciales) ponderado por qty.
Objetivo: Servicio puro que calcula avgPrice desde fills del ciclo.
Pasos concretos:
- Implementar `AvgPriceCalculator`
- Entrada: lista de fills (price, qty)
- Salida: `Price`
Criterios de aceptación:
- [ ] Incluye fills parciales
- [ ] Rechaza lista vacía (o retorna null según diseño)
Artefactos esperados:
- `packages/core/src/application/services/avg-price-calculator.ts`
Tests requeridos:
- unit

### TECH-034 — UC-07/US-07: Regla take-profit (avgPrice * 1.08, vender 100% MARKET)
Trazabilidad:
- US-07
- UC-07
Contexto: PRD: TP cuando precio_actual >= avg*1.08, vender 100% por market.
Objetivo: Emitir intent `place_tp_sell_all`.
Pasos concretos:
- Implementar condición en `StrategyEvaluator`
- Requerir `avgPrice` y `positionQty>0`
Criterios de aceptación:
- [ ] TP solo se evalúa si hay posición
Artefactos esperados:
- `packages/core/src/application/services/strategy-evaluator.ts`
Tests requeridos:
- unit

### TECH-035 — UC-08/US-08: Reiniciar ciclo automático post-TP
Trazabilidad:
- US-08
- UC-08
Contexto: PRD: después de venta por TP, inicia nuevo ciclo.
Objetivo: Crear Cycle nuevo y resetear contadores/referencia.
Pasos concretos:
- Implementar handler `ApplyCycleResetAfterTp`
- Crear nuevo Cycle con referencia = precio actual al reset
- Registrar evento `CYCLE_RESTARTED`
Criterios de aceptación:
- [ ] Tras TP, `regularBuysCount=0` y `extensionUsed=false`
Artefactos esperados:
- `packages/core/src/application/handlers/apply-cycle-reset-after-tp.ts`
Tests requeridos:
- unit

### TECH-036 — UC-12/US-12: Regla trapped (sin cash y sin TP)
Trazabilidad:
- US-12
- UC-12
Contexto: PRD: trapped cuando se agota el capital sin TP.
Objetivo: Emitir intent `mark_trapped` y persistir estado.
Pasos concretos:
- Definir Condición: evaluar estado `trapped` según definición operativa en PRD §Estado: trapped
- Actualizar Bot a `trapped`
- Registrar evento `TRAPPED_ENTERED`
Criterios de aceptación:
- [ ] Bot pasa a trapped solo si no puede comprar más
Artefactos esperados:
- `packages/core/src/application/services/strategy-evaluator.ts`
- `packages/core/src/application/handlers/mark-trapped.ts`
Tests requeridos:
- unit

---

# 6) Persistencia: esquema DB, migraciones, repositorios

> **Nota de ejecución:** antes de worker real, DB debe soportar runtime, commands, events, orders y fills.

### TECH-037 — Diseñar schema SQL base: bots, cycles, orders, fills, business_events, bot_runtime, bot_commands
Trazabilidad:
- US-01
- UC-01
Contexto: ADR define tablas fuente de verdad y runtime/commands.
Objetivo: Documento de esquema inicial para migraciones SQL.
Pasos concretos:
- Definir DDL con UUIDv7, FK estrictas, índices mínimos
- Incluir columnas clave: statuses, snapshots, idempotency_key, clientOrderId
Criterios de aceptación:
- [ ] DDL cubre lo listado en ADR (commands/runtime/events/orders/fills)
Artefactos esperados:
- `packages/infra-db/migrations/0001_init.sql`
Tests requeridos:
- integration

### TECH-038 — Implementar migración SQL 0001_init.sql
Trazabilidad:
- US-01
- UC-01
Contexto: DB es command bus y source of truth.
Objetivo: Levantar DB con tablas y constraints.
Pasos concretos:
- Crear migración SQL
- Agregar tabla migrations (si aplica) o mecanismo elegido
Criterios de aceptación:
- [ ] `pnpm db:migrate` crea todas las tablas
Artefactos esperados:
- `packages/infra-db/migrations/0001_init.sql`
- Script `pnpm db:migrate`
Tests requeridos:
- integration

### TECH-039 — Infra DB: wiring Kysely + Pool + healthcheck query
Trazabilidad:
- US-02
- UC-02
Contexto: API y worker requieren DB para operar.
Objetivo: Cliente DB reutilizable desde apps.
Pasos concretos:
- Implementar `createDb()` en `infra-db`
- Implementar `db.health()` (SELECT 1)
Criterios de aceptación:
- [ ] API `/health` verifica DB OK
Artefactos esperados:
- `packages/infra-db/src/db.ts`
Tests requeridos:
- integration

### TECH-040 — Repositorio Bot (infra-db) implementando BotRepositoryPort
Trazabilidad:
- US-01
- UC-01
Contexto: Persistencia de bots/cambios de estado.
Objetivo: CRUD mínimo requerido por use cases.
Pasos concretos:
- Implementar `create`, `getById`, `updateStatus`, `updateCapital`, `markTerminated`
- Mapear VO ↔ columnas
Criterios de aceptación:
- [ ] Guarda y lee Bot sin pérdida de datos
Artefactos esperados:
- `packages/infra-db/src/repositories/bot.repository.ts`
Tests requeridos:
- integration

### TECH-041 — Repositorio Cycle (infra-db) implementando CycleRepositoryPort
Trazabilidad:
- US-04
- UC-04
Contexto: Cycle guarda referencia, contadores, avgPrice, flags.
Objetivo: Persistir y consultar Cycle activo por bot.
Pasos concretos:
- Implementar `getActiveByBotId`, `createNewCycle`, `updateReference`, `incrementRegularBuys`, `markExtensionUsed`, `setAvgPrice`, `resetAfterTp`
Criterios de aceptación:
- [ ] Mantiene invariantes (no >5 regular, no >1 extension) vía core
Artefactos esperados:
- `packages/infra-db/src/repositories/cycle.repository.ts`
Tests requeridos:
- integration

### TECH-042 — Repositorio Orders/Fills (infra-db) + raw request/response
Trazabilidad:
- US-06
- UC-06
Contexto: ADR exige almacenar request/response crudos + columnas normalizadas.
Objetivo: Guardar intent/order y fills parciales.
Pasos concretos:
- Implementar `saveOrder`, `updateOrderStatus`, `insertFillsForOrder`, `listFillsByCycle`
- Guardar JSON crudo del exchange
Criterios de aceptación:
- [ ] Permite 1..n fills por order
Artefactos esperados:
- `packages/infra-db/src/repositories/order.repository.ts`
- `packages/infra-db/src/repositories/fill.repository.ts`
Tests requeridos:
- integration

### TECH-043 — Repositorio BusinessEvents (infra-db) append-only
Trazabilidad:
- US-14
- UC-14
Contexto: ADR define `business_events` append-only (no event sourcing).
Objetivo: Insert-only con idempotency_key unique.
Pasos concretos:
- Implementar `append(event)`
- Enforce unique (idempotency_key)
Criterios de aceptación:
- [ ] Insert duplicado por idempotency_key no duplica evento
Artefactos esperados:
- `packages/infra-db/src/repositories/business-events.repository.ts`
Tests requeridos:
- integration

### TECH-044 — Repositorio BotCommands (infra-db) como command bus simple
Trazabilidad:
- US-02
- UC-02
Contexto: ADR define `bot_commands` con leasing/attempts/status.
Objetivo: Encolar y claim de comandos por worker.
Pasos concretos:
- Implementar `enqueue(botId,type,payload)`
- Implementar `claimNextPending(now, leaseMs)` (status pending→processing con lease)
- Implementar `markDone`, `markFailed(increment attempts)`
Criterios de aceptación:
- [ ] Claim es atómico (no doble procesamiento)
Artefactos esperados:
- `packages/infra-db/src/repositories/bot-commands.repository.ts`
Tests requeridos:
- integration

### TECH-045 — BotRuntime + advisory locks (infra-db)
Trazabilidad:
- US-04
- UC-04
Contexto: ADR: “a lo más una ejecución por bot” con advisory locks + bot_runtime.
Objetivo: Utilidad para lock por bot y marcar heartbeat/runtime.
Pasos concretos:
- Implementar `withBotLock(botId, fn)` usando advisory locks pg
- Implementar update `bot_runtime` (last_seen, degraded_mode, etc.)
Criterios de aceptación:
- [ ] Dos ejecuciones concurrentes del mismo bot no corren a la vez
Artefactos esperados:
- `packages/infra-db/src/runtime/bot-lock.ts`
- `packages/infra-db/src/repositories/bot-runtime.repository.ts`
Tests requeridos:
- integration

---

# 7) Exchange: adapter Binance (WS price + WS user data) + polling fallback

> **Nota de ejecución:** aquí solo infra. El core ya está cerrado: implementas ExchangePort.

### TECH-046 — Implementar adapter Exchange Binance Spot (base HTTP)
Trazabilidad:
- US-04
- UC-04
Contexto: Core usa ExchangePort; infra implementa Binance.
Objetivo: Adapter con auth, firmas y requests base.
Pasos concretos:
- Implementar cliente HTTP Binance
- Manejar errores y rate-limit básico
Criterios de aceptación:
- [ ] Puede obtener precio actual de un par permitido
Artefactos esperados:
- `packages/infra-exchange-binance/src/binance-http.client.ts`
- `packages/infra-exchange-binance/src/exchange.adapter.ts`
Tests requeridos:
- integration

### TECH-047 — Implementar `placeLimitBuyGtc` con clientOrderId e idempotency
Trazabilidad:
- US-04
- UC-04
Contexto: Compras LIMIT GTC; idempotency_key + clientOrderId determinista.
Objetivo: Colocar orden LIMIT GTC y registrar response crudo.
Pasos concretos:
- Generar `clientOrderId` determinista desde `idempotency_key`
- Llamar endpoint de orden LIMIT con `timeInForce=GTC`
- Retornar `OrderRef`
Criterios de aceptación:
- [ ] Orden creada es LIMIT y GTC
Artefactos esperados:
- `packages/infra-exchange-binance/src/exchange.adapter.ts`
Tests requeridos:
- integration

### TECH-048 — Implementar cancelación explícita del remanente (cancelOrder)
Trazabilidad:
- US-04
- UC-04
Contexto: Tras fill parcial se cancela remanente.
Objetivo: Cancelar orden por `OrderRef/clientOrderId`.
Pasos concretos:
- Implementar endpoint cancel
- Manejar “already closed” / “unknown order” como idempotente (no error fatal)
- Si la llamada de cancel falla por red/timeout, tratarlo como resultado **no concluyente** (no asumir cancelado)
- Exponer respuesta normalizada: {status: canceled | already_closed | unknown | failed_transient | failed_permanent}
Criterios de aceptación:
- [ ] Cancel es idempotente ante orden ya cerrada
[ ] Si cancel falla o llega tarde, el sistema puede reconciliar el estado final consultando el exchange (ver TECH-052)
Artefactos esperados:
- `packages/infra-exchange-binance/src/exchange.adapter.ts`
Tests requeridos:
- integration

### TECH-049 — Implementar `placeMarketSellAll` (TP 100% MARKET)
Trazabilidad:
- US-07
- UC-07
Contexto: TP es MARKET 100%.
Objetivo: Ejecutar market sell de toda la posición del ciclo.
Pasos concretos:
- Calcular qty a vender desde `positionQty`
- Colocar orden MARKET sell
Criterios de aceptación:
- [ ] Tipo de orden SELL MARKET
Artefactos esperados:
- `packages/infra-exchange-binance/src/exchange.adapter.ts`
Tests requeridos:
- integration

### TECH-050 — WS precios: feed por par + reconexión
Trazabilidad:
- US-03
- UC-03
Contexto: WS precio para evaluación inmediata.
Objetivo: Suscripción WS para precio y callback.
Pasos concretos:
- Implementar ws client
- Suscribir a ticker/miniTicker según par
- Reconectar con backoff
Criterios de aceptación:
- [ ] Si WS cae, intenta reconectar
Artefactos esperados:
- `packages/infra-exchange-binance/src/ws-price.stream.ts`
Tests requeridos:
- integration

### TECH-051 — WS user data stream: recibir fills/exec reports
Trazabilidad:
- US-06
- UC-06
Contexto: User data stream + polling fallback.
Objetivo: Consumir eventos de ejecución para actualizar orders/fills.
Pasos concretos:
- Implementar listenKey lifecycle
- Parsear execution reports a `ExchangeFill`
Criterios de aceptación:
- [ ] Al recibir fill parcial, genera evento interno de fill
Artefactos esperados:
- `packages/infra-exchange-binance/src/ws-userdata.stream.ts`
Tests requeridos:
- integration

### TECH-052 — Polling fallback: precio + estado de órdenes
Trazabilidad:
- US-03
- UC-03
Contexto: Fallback para caídas WS y reconciliación.
Objetivo: Métodos polling para usar cuando WS no está OK.
Pasos concretos:
- Implementar `pollCurrentPrice`
- Implementar `pollOrderStatus(clientOrderId)` que devuelva:
  - estado normalizado (NEW | PARTIALLY_FILLED | FILLED | CANCELED | REJECTED | EXPIRED)
  - fills ejecutados (si el exchange los expone por consulta)
- Soportar “reconciliación tras cancelación”:
  - después de intentar cancelar (TECH-048), consultar el estado final hasta observar terminal (FILLED o CANCELED) o agotar intentos
  - si el estado resulta FILLED (total o adicional), persistir fills reales y recalcular avgPrice (TECH-058)
- Asegurar deduplicación de fills en persistencia (por id del fill / (orderRef, tradeId) según exchange) para tolerar “double execution report”
Criterios de aceptación:
- [ ] Worker puede operar sin WS usando polling
[ ] Ante cancel no concluyente, polling permite determinar estado final y persistir únicamente fills reales
- [ ] Polling repetido no duplica fills en DB
Artefactos esperados:
- `packages/infra-exchange-binance/src/polling.ts`
Tests requeridos:
- integration

---

# 8) Engine worker: loop, locking, idempotencia, retries/backoff, degraded mode

> **Nota de ejecución:** esta sección es el corazón. No la empieces si DB/ports/adapters no están listos.

### TECH-053 — Worker: loop principal que lista bots activos y procesa por bot con lock
Trazabilidad:
- US-04
- UC-04
Contexto: Un solo worker maneja bots y a lo más una ejecución por bot.
Objetivo: Procesamiento periódico + lock por bot.
Pasos concretos:
- Consultar bots `active`
- Para cada bot: `withBotLock(botId, processBotTick)`
- Manejar errores por bot (no tumbar worker)
Criterios de aceptación:
- [ ] Dos ticks concurrentes del mismo bot no se ejecutan simultáneamente
Artefactos esperados:
- `apps/worker/src/engine/worker-loop.ts`
Tests requeridos:
- integration

### TECH-054 — Worker: pipeline `processBotTick` (load state → get price → evaluate → apply intents)
Trazabilidad:
- US-04
- UC-04
Contexto: Core decide intents; worker ejecuta IO y persiste.
Objetivo: Orquestación determinista.
Pasos concretos:
- Cargar Bot + Cycle + balances
- Obtener precio (WS si ok, si no polling)
- Llamar `StrategyEvaluator`
- Ejecutar intents y persistir resultados + events
Criterios de aceptación:
- [ ] Cada intent deja estado consistente
Artefactos esperados:
- `apps/worker/src/engine/process-bot-tick.ts`
Tests requeridos:
- integration

### TECH-055 — Worker: modo degradado (WS caído → polling) + flag + notificación
Trazabilidad:
- US-14
- UC-14
Contexto: degraded_mode con notificación.
Objetivo: Detectar estado WS y activar degraded_mode.
Pasos concretos:
- Detectar WS down por timeout/estado
- Persistir `degraded_mode=true` en runtime
- Emitir evento + notificación
Criterios de aceptación:
- [ ] En degraded_mode sigue operando con polling
Artefactos esperados:
- `apps/worker/src/engine/degraded-mode.ts`
Tests requeridos:
- integration

### TECH-056 — Worker: idempotencia de “place buy” usando idempotency_key
Trazabilidad:
- US-04
- UC-04
Contexto: Evitar duplicar compras ante retries.
Objetivo: Antes de colocar orden, comprobar si ya existe por idempotency_key.
Pasos concretos:
- Generar idempotency_key por (botId, cycleId, buyIndex, type)
- Verificar orden existente por key
- Si existe: reconciliar en vez de crear nueva
Criterios de aceptación:
- [ ] Retry de tick no duplica orden
Artefactos esperados:
- `apps/worker/src/engine/idempotency.ts`
Tests requeridos:
- integration

### TECH-057 — Worker: ejecución de compra LIMIT GTC + manejo de fills parciales (cancel remanente)
Trazabilidad:
- US-04
- UC-04
Contexto: Fills parciales aceptados; cancel remanente; cash no usado queda disponible.
Objetivo: Flujo completo buy.
Pasos concretos:
- Colocar LIMIT GTC
- Esperar fill (WS user data o polling)
- Si fill parcial: cancelar remanente y reconciliar estado final de la orden consultando el exchange
- Guardar order + fills; actualizar Cycle
Criterios de aceptación:
- [ ] Fill parcial se guarda como válido
- [ ] Remanente se cancela explícitamente
[ ] El estado final de la orden y los fills se determina por reconciliación, incluso si la cancelación falla o llega tarde
Artefactos esperados:
- `apps/worker/src/engine/actions/execute-limit-buy.ts`
Tests requeridos:
- integration

### TECH-058 — Worker: cálculo y persistencia de avgPrice tras cada fill válido
Trazabilidad:
- US-06
- UC-06
Contexto: Promedio ponderado por fills reales.
Objetivo: Recalcular avgPrice del ciclo al guardar fills.
Pasos concretos:
- Obtener fills del ciclo
- Calcular con `AvgPriceCalculator`
- Persistir avgPrice en Cycle
Criterios de aceptación:
- [ ] avgPrice cambia solo con fills reales
Artefactos esperados:
- `apps/worker/src/engine/actions/recompute-avg-price.ts`
Tests requeridos:
- integration

### TECH-059 — Worker: ejecución TP (MARKET sell 100%) + cierre de ciclo + evento
Trazabilidad:
- US-07
- UC-07
Contexto: TP es salida MARKET y cierre de ciclo.
Objetivo: Vender y registrar order/fills + evento.
Pasos concretos:
- Colocar MARKET sell por qty total
- Guardar order + fills
- Marcar TP ejecutado y disparar reset ciclo
Criterios de aceptación:
- [ ] Tras TP existe evento TP_EXECUTED
Artefactos esperados:
- `apps/worker/src/engine/actions/execute-tp-sell.ts`
Tests requeridos:
- integration

### TECH-060 — Worker: reinicio automático del ciclo post-TP
Trazabilidad:
- US-08
- UC-08
Contexto: Reinicio automático.
Objetivo: Ejecutar handler de reset y persistir nuevo cycle.
Pasos concretos:
- Ejecutar `ApplyCycleResetAfterTp`
- Crear Cycle nuevo y set referencia
Criterios de aceptación:
- [ ] Nuevo ciclo creado automáticamente
Artefactos esperados:
- `apps/worker/src/engine/actions/reset-cycle-after-tp.ts`
Tests requeridos:
- integration

### TECH-061 — Worker: marcar trapped cuando no hay cash y no hay TP
Trazabilidad:
- US-12
- UC-12
Contexto: trapped cuando se agota el capital sin TP.
Objetivo: Cambiar estado a trapped y notificar.
Pasos concretos:
- Ejecutar `mark-trapped` handler cuando evaluator lo pida
- Registrar evento + notificación
Criterios de aceptación:
- [ ] Bot pasa a `trapped` y se notifica
Artefactos esperados:
- `apps/worker/src/engine/actions/mark-trapped.ts`
Tests requeridos:
- integration

### TECH-062 — Worker: retries/backoff + circuit breaker simple (por exchange)
Trazabilidad:
- US-04
- UC-04
Contexto: exponential backoff + jitter + circuit breaker simple.
Objetivo: Reintentos controlados sin duplicar órdenes.
Pasos concretos:
- Implementar helper `retryWithBackoff`
- Implementar breaker por operación (price/orders)
- Integrar en llamadas exchange
Criterios de aceptación:
- [ ] Errores transitorios reintentan; permanentes no
Artefactos esperados:
- `apps/worker/src/engine/resilience/retry.ts`
- `apps/worker/src/engine/resilience/circuit-breaker.ts`
Tests requeridos:
- unit

### TECH-063 — Worker: procesamiento de bot_commands (START/PAUSE/RESUME/TERMINATE)
Trazabilidad:
- US-02
- UC-02
Contexto: DB command bus; API encola comandos; worker los aplica.
Objetivo: Worker claim y aplica comandos de control.
Pasos concretos:
- Implementar poller de `bot_commands`
- Claim con lease y status transitions
- Aplicar cambios a bots según comando
Criterios de aceptación:
- [ ] Un comando se procesa una sola vez
Artefactos esperados:
- `apps/worker/src/commands/command-processor.ts`
Tests requeridos:
- integration

---

# 9) API endpoints REST + DTOs + OpenAPI

> **Nota de ejecución:** la API es **control plane**. No metas la estrategia aquí.

### TECH-064 — API: OpenAPI básico (Swagger) + versionado
Trazabilidad:
- US-01
- UC-01
Contexto: REST + OpenAPI para contratos claros.
Objetivo: Swagger habilitado y consistente.
Pasos concretos:
- Configurar Swagger en NestJS
- Exponer `/docs`
Criterios de aceptación:
- [ ] `/docs` muestra endpoints
Artefactos esperados:
- `apps/api/src/openapi.ts` o config en `main.ts`
Tests requeridos:
- integration

### TECH-065 — API: Endpoint Crear Bot (POST /bots)
Trazabilidad:
- US-01
- UC-01
Contexto: UC-01 debe existir en API.
Objetivo: Crear bot con validación y respuesta con id.
Pasos concretos:
- DTO CreateBotRequest
- Llamar `CreateBotUseCase`
- Responder 201 con botId
Criterios de aceptación:
- [ ] Crear bot con par inválido devuelve 400
Artefactos esperados:
- `apps/api/src/bots/bots.controller.ts`
- `apps/api/src/bots/dto/create-bot.dto.ts`
Tests requeridos:
- integration

### TECH-066 — API: Endpoint Iniciar Bot (POST /bots/:id/start)
Trazabilidad:
- US-02
- UC-02
Contexto: Iniciar activa bot y encola comando.
Objetivo: Control plane sin lógica de trading.
Pasos concretos:
- Llamar `StartBotUseCase`
Criterios de aceptación:
- [ ] Encola comando START y bot queda active
Artefactos esperados:
- `apps/api/src/bots/actions/start-bot.controller.ts`
Tests requeridos:
- integration

### TECH-067 — API: Endpoint Pausar Bot (POST /bots/:id/pause)
Trazabilidad:
- US-09
- UC-09
Contexto: Pausar es acción de usuario.
Objetivo: Cambiar a paused.
Pasos concretos:
- Llamar `PauseBotUseCase`
Criterios de aceptación:
- [ ] Bot queda paused
Artefactos esperados:
- `apps/api/src/bots/actions/pause-bot.controller.ts`
Tests requeridos:
- integration

### TECH-068 — API: Endpoint Reanudar Bot (POST /bots/:id/resume)
Trazabilidad:
- US-10
- UC-10
Contexto: Reanudar bot pausado.
Objetivo: Bot vuelve active.
Pasos concretos:
- Llamar `ResumeBotUseCase`
Criterios de aceptación:
- [ ] Bot vuelve active solo si estaba paused
Artefactos esperados:
- `apps/api/src/bots/actions/resume-bot.controller.ts`
Tests requeridos:
- integration

### TECH-069 — API: Endpoint Inyectar Capital (POST /bots/:id/capital)
Trazabilidad:
- US-11
- UC-11
Contexto: Inyección de capital.
Objetivo: Aumentar capital operativo.
Pasos concretos:
- DTO amount+currency
- Llamar `InjectCapitalUseCase`
Criterios de aceptación:
- [ ] initialCapital no cambia
Artefactos esperados:
- `apps/api/src/bots/actions/inject-capital.controller.ts`
- `apps/api/src/bots/dto/inject-capital.dto.ts`
Tests requeridos:
- integration

### TECH-070 — API: Endpoint Finalizar Bot (POST /bots/:id/terminate)
Trazabilidad:
- US-13
- UC-13
Contexto: Apagar bot definitivamente.
Objetivo: Bot queda terminated.
Pasos concretos:
- Llamar `TerminateBotUseCase`
Criterios de aceptación:
- [ ] Bot no vuelve a active después
Artefactos esperados:
- `apps/api/src/bots/actions/terminate-bot.controller.ts`
Tests requeridos:
- integration

### TECH-071 — API: Endpoint Consultar Estado Operativo (GET /bots/:id)
Trazabilidad:
- US-14
- UC-14
Contexto: API mínima incluye consultar estado operativo.
Objetivo: Devolver estado actual (bot + cycle + flags runtime).
Pasos concretos:
- Query repo para bot + cycle + runtime
- DTO de respuesta estable
Criterios de aceptación:
- [ ] Respuesta incluye status, referencePrice, avgPrice, counts, trapped/degraded
Artefactos esperados:
- `apps/api/src/bots/bots.query.controller.ts`
- `apps/api/src/bots/dto/bot-status.response.ts`
Tests requeridos:
- integration

---

# 10) Notificaciones: adapter Telegram (eventos notificados)

> **Nota de ejecución:** notifica solo lo definido: inicio del bot, compra, referencia, TP, trapped, degraded.

### TECH-072 — Implementar Telegram adapter (NotificationPort)
Trazabilidad:
- US-14
- UC-14
Contexto: Telegram desde inicio.
Objetivo: Enviar mensajes a chat configurado por env.
Pasos concretos:
- Implementar cliente Telegram
- Implementar `notify(event)` con templates por tipo
Criterios de aceptación:
- [ ] Enviar mensaje de prueba desde worker
Artefactos esperados:
- `packages/infra-notifications-telegram/src/telegram.client.ts`
- `packages/infra-notifications-telegram/src/notification.adapter.ts`
Tests requeridos:
- integration

### TECH-073 — Notificar eventos: inicio/parada/pause/resume
Trazabilidad:
- US-14
- UC-14
Contexto: Eventos notificados (inicio/parada/pausa/resume).
Objetivo: Emitir notificaciones al ocurrir esos eventos.
Pasos concretos:
- Hook en handlers/use cases para append business_event
- Worker: dispatcher simple que lee events recientes y notifica (o notificar inline al append)
Criterios de aceptación:
- [ ] Se envía notificación al iniciar y al terminar
Artefactos esperados:
- `apps/worker/src/notifications/event-notifier.ts`
Tests requeridos:
- integration

### TECH-074 — Notificar compras (incluye fill parcial) + referencia actualizada + TP + trapped + degraded
Trazabilidad:
- US-14
- UC-14
Contexto: Cobertura completa de notificaciones operativas v1.
Objetivo: Notificar: BUY (y parcial), REFERENCE_UPDATED, TP_EXECUTED, TRAPPED_ENTERED, DEGRADED_ON/OFF.
Pasos concretos:
- Mapear eventos a mensajes
- Asegurar que fill parcial dispara mensaje y menciona cancel remanente
Criterios de aceptación:
- [ ] Se notifica todo lo listado arriba
Artefactos esperados:
- `apps/worker/src/notifications/event-notifier.ts` (actualización)
- Templates por evento
Tests requeridos:
- integration

---

# 11) Infra: Dockerfiles, docker-compose (local / itg / prod), env, healthchecks

> **Nota de ejecución:** deja local perfecto primero. Luego itg/prod son variaciones de env.

### TECH-075 — Dockerfile para apps/api
Trazabilidad:
- US-01
- UC-01
Contexto: Docker Compose + VPS.
Objetivo: Imagen reproducible para API.
Pasos concretos:
- Crear Dockerfile multi-stage (build + runtime)
- Exponer puerto
Criterios de aceptación:
- [ ] `docker build` de api funciona
Artefactos esperados:
- `apps/api/Dockerfile`
Tests requeridos:
- none

### TECH-076 — Dockerfile para apps/worker
Trazabilidad:
- US-03
- UC-03
Contexto: Worker 24/7 debe correr en contenedor.
Objetivo: Imagen reproducible para worker.
Pasos concretos:
- Dockerfile multi-stage
- CMD arranca worker
Criterios de aceptación:
- [ ] `docker build` de worker funciona
Artefactos esperados:
- `apps/worker/Dockerfile`
Tests requeridos:
- none

### TECH-077 — docker-compose.local: postgres + api + worker
Trazabilidad:
- US-01
- UC-01
Contexto: Operación local obligatoria.
Objetivo: Stack local levantable con un comando.
Pasos concretos:
- Crear compose con postgres
- Montar env vars mínimas
- Networks/depends_on
Criterios de aceptación:
- [ ] `docker compose up` levanta todo
Artefactos esperados:
- `docker-compose.local.yml`
Tests requeridos:
- none

### TECH-078 — docker-compose.itg (testnet) y docker-compose.prod (prod)
Trazabilidad:
- US-04
- UC-04
Contexto: itg (testnet) y prod.
Objetivo: Composes separados por entorno.
Pasos concretos:
- Crear `docker-compose.itg.yml` con flags/urls testnet
- Crear `docker-compose.prod.yml` con flags prod
Criterios de aceptación:
- [ ] Variables diferenciadas por entorno (sin cambios de código)
Artefactos esperados:
- `docker-compose.itg.yml`
- `docker-compose.prod.yml`
Tests requeridos:
- none

### TECH-079 — Variables de entorno: plantilla + validación de configuración
Trazabilidad:
- US-01
- UC-01
Contexto: env vars solo para entorno; credenciales solo worker.
Objetivo: `.env.example` y validación al boot.
Pasos concretos:
- Definir `.env.example` (DB, Binance keys, Telegram)
- Validar en arranque (API y worker)
Criterios de aceptación:
- [ ] Falta env requerida → proceso falla con mensaje claro
Artefactos esperados:
- `.env.example`
- `apps/api/src/config/*`
- `apps/worker/src/config/*`
Tests requeridos:
- unit

### TECH-080 — Healthchecks: API (DB OK) y Worker (DB OK + WS OK o polling activo)
Trazabilidad:
- US-14
- UC-14
Contexto: Healthchecks específicos.
Objetivo: Endpoints/estado para ver salud operativa.
Pasos concretos:
- API `/health` verifica DB
- Worker expone health con DB + ws/polling status
Criterios de aceptación:
- [ ] Worker health indica degraded_mode cuando WS no está OK
Artefactos esperados:
- `apps/api/src/health.controller.ts` (actualización)
- `apps/worker/src/health/*`
Tests requeridos:
- integration

### TECH-081 — Logging JSON a stdout (api y worker)
Trazabilidad:
- US-14
- UC-14
Contexto: logs JSON a stdout.
Objetivo: Logger estructurado consistente.
Pasos concretos:
- Configurar logger JSON en NestJS
- Incluir correlationId/botId cuando aplique
Criterios de aceptación:
- [ ] Logs contienen `level`, `msg`, `timestamp`
Artefactos esperados:
- `apps/api/src/logger/*`
- `apps/worker/src/logger/*`
Tests requeridos:
- none

---

# 12) CI / Calidad: lint, tests, build, DoD mínimo

> **Nota de ejecución:** no cierres el backlog sin CI en green.

### TECH-082 — Configurar runner de tests (unit + integration + e2e) en monorepo
Trazabilidad:
- US-01
- UC-01
Contexto: Validar core y flujos con DB.
Objetivo: Tener suites separadas (unit/integration/e2e) y comandos locales estándar.
Pasos concretos:
- Configurar runner por workspace
- Definir scripts locales: `test:unit`, `test:integration`, `test:e2e`, y `test` (agrega las 3)
- Setup de integración con Postgres (docker) para repos
- Setup e2e: levantar stack de test (DB + API + Worker) contra un **ExchangeAdapter fake** (sin pegarle a Binance)
Criterios de aceptación:
- [ ] `pnpm -w test:unit` corre unit
- [ ] `pnpm -w test:integration` corre integration
- [ ] `pnpm -w test:e2e` corre e2e
- [ ] `pnpm -w test` corre unit + integration + e2e
Artefactos esperados:
- Config de test en root
- `packages/**/__tests__/*` o estructura equivalente
Tests requeridos:
- integration

### TECH-083 — Tests unitarios core: referencia dinámica, compras regulares, extensión, TP, trapped
Trazabilidad:
- US-04
- UC-04
Contexto: Reglas del PRD deben quedar cubiertas por tests puros.
Objetivo: Suite de tests del `StrategyEvaluator`.
Pasos concretos:
- Casos UC-03..UC-07, UC-12
- Límites: 5 compras, 1 extensión, TP 1.08, condición -10%
Criterios de aceptación:
- [ ] Cobertura de reglas críticas con asserts verificables
Artefactos esperados:
- `packages/core/src/application/services/__tests__/strategy-evaluator.test.ts`
Tests requeridos:
- unit

### TECH-084 — Tests integración infra-db: migraciones + repositorios + locks
Trazabilidad:
- US-04
- UC-04
Contexto: Persistencia y locks son críticos.
Objetivo: Verificar migrations + repos + advisory locks.
Pasos concretos:
- Levantar DB de test
- Correr migraciones
- Test concurrente de `withBotLock`
Criterios de aceptación:
- [ ] Locks funcionan
Artefactos esperados:
- `packages/infra-db/src/__tests__/*`
Tests requeridos:
- integration

### TECH-085 — Tests integración worker: tick idempotente no duplica órdenes
Trazabilidad:
- US-04
- UC-04
Contexto: Idempotencia y transacción por step.
Objetivo: Simular retry y confirmar no duplicación.
Pasos concretos:
- Usar fake exchange adapter o stub en modo test
- Ejecutar `processBotTick` dos veces
- Verificar 1 orden con misma idempotency_key
Criterios de aceptación:
- [ ] No hay duplicados de órdenes
Artefactos esperados:
- `apps/worker/src/engine/__tests__/idempotency.integration.test.ts`
Tests requeridos:
- integration


### TECH-088 — Tests e2e: flujo completo (API → commands → worker → orders/fills → events)
Trazabilidad:
- US-04
- UC-04
Contexto: Validar el sistema como unidad: API (control plane) encola comandos, worker ejecuta estrategia, persiste órdenes/fills/eventos y respeta idempotencia/locks.
Objetivo: Suite e2e que cubra los escenarios críticos sin usar Binance real (usa ExchangeAdapter fake determinista).
Pasos concretos:
- Levantar stack e2e (DB + API + Worker) con `docker compose` o bootstrap de test
- Implementar Exchange fake que permita:
  - fijar una secuencia de precios por tick
  - emitir fills parciales/complete
  - simular WS down para degraded_mode
- Caso 1: crear bot → start → precio cae → ejecuta compra regular (se crea order + fills)
- Caso 2: fill parcial → cancela remanente → avgPrice se calcula solo con fills reales
- Caso 3: precio sube a TP → sell MARKET 100% → reinicia ciclo
- Caso 4: retry tick → no duplica órdenes (idempotency_key)
- Caso 5: WS down → degraded_mode → sigue con polling y notifica
Criterios de aceptación:
- [ ] Los 5 casos pasan en CI y local
- [ ] No hay órdenes duplicadas por retries
- [ ] `business_events` contiene los eventos esperados por escenario
Artefactos esperados:
- `apps/worker/src/__e2e__/bot-flow.e2e.test.ts` (o equivalente)
- `apps/worker/src/__e2e__/fakes/exchange.fake.ts`
- Script `pnpm -w test:e2e`
Tests requeridos:
- e2e


