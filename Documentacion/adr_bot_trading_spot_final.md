# ADR — Arquitectura del Bot de Trading Spot (DCA + TP)

**Proyecto:** Bot de Trading Spot (Binance)  
**Objetivo:** Implementar fielmente el PRD aprobado (DCA por caídas, referencia dinámica, compra de extensión única, take-profit fijo).  
**Restricciones explícitas:** sin IA, sin indicadores técnicos, sin optimización dinámica.  
**Estado:** Aprobado  
**Versión:** v2  
**Fecha:** 2026-01-13  

---

## ADR-01 — Estructura del repositorio

### Decisión
Monorepo con **pnpm workspaces** y **Turborepo**.

### Layout
```
apps/
  api/        # Control plane (HTTP)
  worker/     # Engine de trading 24/7
packages/
  core/       # Dominio + aplicación (puro)
  infra-db/
  infra-exchange-binance/
  infra-notifications-telegram/
```

### Enforcements
- eslint-plugin-boundaries
- no-restricted-imports

### Motivación
Separar estrictamente dominio, aplicación e infraestructura, preservando límites claros y evitando acoplamientos indebidos.

---

## ADR-02 — Arquitectura

### Decisión
**DDD completo + Arquitectura Hexagonal (Ports & Adapters).**

### Reglas
- `packages/core` no depende de NestJS, DB, SDKs de exchange ni servicios externos.
- Todo IO se accede mediante ports.
- Adapters viven en `packages/infra-*`.

---

## ADR-03 — Runtime y framework

### Decisión
**Node.js + TypeScript + NestJS.**

---

## ADR-04 — Superficie de operación

### Decisión
API HTTP mínima para:
- Crear / eliminar bots
- Iniciar / pausar / detener bots
- Consultar estado operativo

### Fuera de alcance
- UI / Dashboard
- Analítica visual

---

## ADR-05 — Separación API / Worker

### Decisión
Dos procesos independientes:
- `apps/api`: control-plane
- `apps/worker`: engine de trading

### Regla
La API **nunca** ejecuta lógica de trading.

---

## ADR-06 — Notificaciones

### Decisión
Telegram desde el inicio.

### Eventos
- Inicio / parada del bot
- Compras (incluye fills parciales)
- Actualización de referencia
- Take-profit ejecutado
- Entrada / salida de estado trapped
- Entrada / salida de modo degradado

---

## ADR-07 — Modelo de ejecución del worker

### Decisión
- Event-driven vía WebSocket (precio → evaluación inmediata)
- Fallback a polling para:
  - Caídas del WS
  - Reconciliación
  - Timeouts
  - Retries

---

## ADR-08 — Concurrencia

### Decisión
Un solo worker maneja todos los bots.

### Garantía
A lo más una ejecución por bot.

### Mecanismo
- Tabla `bot_runtime`
- Advisory locks en PostgreSQL

---

## ADR-09 — Comandos API → Worker

### Decisión
Base de datos como command bus simple.

### Tabla `bot_commands`
- id (uuidv7)
- bot_id
- type
- payload (jsonb)
- status (pending | processing | done | failed)
- attempts
- lease_until
- created_at
- processed_at
- error

---

## ADR-10 — Consistencia transaccional

### Decisión
Transacción por step (no por tick completo).

### Regla
Cada step deja el sistema en un estado consistente e idempotente.

---

## ADR-11 — Estado actual (source of truth)

### Decisión
Estado actual vive en:
- `bots`
- `cycles`

### Auditoría
- `orders`
- `fills`

### Trazabilidad
- `business_events` (append-only, no event sourcing)

---

## ADR-12 — Base de datos y acceso

### Decisión
- PostgreSQL
- Migraciones SQL puras
- Kysely como query builder
- UUID v7
- Foreign Keys estrictas
- Soft delete donde aplique

---

## ADR-13 — Estado del ciclo

### Decisión
Modelo mixto:
- Columnas explícitas para estado operativo
- `state_snapshot` JSONB opcional para debug

---

## ADR-14 — Orders y fills

### Decisión
- `orders`: intento / request / response / status
- `fills`: 1..n (parciales, fees, timestamps)

---

## ADR-15 — Idempotencia de órdenes

### Decisión
- `idempotency_key` interna (UNIQUE)
- `clientOrderId` del exchange

---

## ADR-16 — Business events

### Decisión
Tabla única `business_events`.

### Campos
- id (uuidv7)
- event_type
- aggregate_type
- aggregate_id
- payload
- created_at
- correlation_id
- idempotency_key

---

## ADR-17 — Retención y particionado

### Decisión
Sin retención ni particionado en v1. Solo índices.

---

## ADR-18 — Abstracción del exchange

### Decisión
`ExchangePort` en core + adapter Binance Spot.

### Características
- Port medianamente grueso
- Tipos propios (`Money`, `Qty`, `OrderIntent`, `Fill`)
- Fake adapter para tests

---

## ADR-19 — Órdenes de compra

### Decisión
Las compras se ejecutan mediante **órdenes LIMIT con timeInForce = GTC**.

### Reglas
- Los **fills parciales están permitidos** y se consideran ejecuciones válidas.
- Tras detectarse un fill parcial:
  - el remanente de la orden se **cancela explícitamente**,
  - el capital no utilizado permanece como **cash disponible**.
- El precio promedio del ciclo se calcula **solo con fills reales**.
- El capital sobrante puede reutilizarse en compras posteriores del ciclo, incluida la compra de extensión.

### Motivación
- Evitar slippage de órdenes MARKET.
- Permitir órdenes resting en el libro.
- Controlar el precio efectivo de entrada.

---

## ADR-20 — Órdenes de take-profit

### Decisión
La venta por take-profit se ejecuta mediante **orden MARKET**.

### Motivación
- Priorizar certeza de salida.
- Evitar riesgo de no ejecución parcial o total.
- Simplificar el cierre del ciclo.
- El slippage es aceptable al tratarse de una salida completa y puntual.

---

## ADR-21 — Reconciliación exchange

### Decisión
User data stream (WebSocket) + polling fallback.

---

## ADR-22 — Retries y resiliencia

### Decisión
Exponential backoff + jitter + circuit breaker simple.

---

## ADR-23 — Rate limits

### Decisión
Throttling interno + contadores + cola interna.  
Sin Redis en v1.

---

## ADR-24 — Auditoría exchange

### Decisión
Guardar request/response crudos (JSON) + columnas normalizadas mínimas.

---

## ADR-25 — Credenciales

### Decisión
- API keys con permisos mínimos (spot trade + read)
- Sin withdrawals
- Una key por cuenta
- Solo en worker (env vars)
- Rotación manual documentada

---

## ADR-26 — Infraestructura

### Decisión
Docker Compose + VPS.

### Entornos
- local
- itg (testnet)
- prod

---

## ADR-27 — Healthchecks

### Decisión
- API: DB OK
- Worker: DB OK + (WS OK o polling activo)

---

## ADR-28 — Operación 24/7

### Decisión
Restart automático + recovery desde DB.

---

## ADR-29 — Logging

### Decisión
Logs JSON a stdout.  
Rotación a cargo del host / Docker.

---

## ADR-30 — Configuración

### Decisión
- Configuración por bot en DB (validada en core)
- Env vars solo para entorno

---

## ADR-31 — Modo degradado

### Decisión
Worker sigue operando con polling si WS cae.  
Flag `degraded_mode` + notificación Telegram.

---

## ADR-32 — Límites explícitos

### Fuera de alcance en v1
- Escalado horizontal
- Multi-exchange
- UI / Dashboard
- Gestión de capital avanzada
- Retención/archivado de datos
- Deploy automático
- Observabilidad avanzada

---

## Estado final

ADR aprobado.  
Este documento es la fuente de verdad para el backlog técnico y la implementación.

