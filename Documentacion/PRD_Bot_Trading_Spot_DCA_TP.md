# PRD — Bot de Trading Spot DCA + Take-Profit

**Versión:** 1.0 (bloqueada)  
**Estado:** Aprobado para ejecución técnica  
**Tipo:** Producto defensivo, spot-only  

---

## 1. Problema y oportunidad

### Problema
El trading manual y los bots reactivos basados en indicadores:
- requieren timing constante,
- fallan en mercados laterales o alcistas prolongados,
- fuerzan decisiones emocionales,
- o introducen riesgo de liquidación.

Además, estrategias DCA con referencias estáticas:
- quedan inactivas en mercados alcistas,
- acumulan capital sin operar,
- reducen eficiencia del sistema.

### Oportunidad
Construir un bot **spot-only**, **determinista** y **defensivo**, que:
- compre solo en caídas,
- venda únicamente con ganancias reales,
- acepte quedar atrapado como riesgo explícito,
- y sea capaz de operar también en mercados alcistas mediante una **referencia dinámica controlada**, sin perseguir el precio.

---

## 2. Objetivo del producto

Recuperar el **100 % del capital inicial asignado a cada bot**, mediante **ganancias realizadas**, operando exclusivamente en mercado spot.

El bot continúa operando después de alcanzar este hito, usando efectivamente *house money*.

---

## 3. Definición de éxito

El bot es exitoso **únicamente cuando**:

> Las ganancias realizadas acumuladas son **mayores o iguales al capital inicial asignado**.

- El tiempo requerido es irrelevante.
- La recuperación parcial **no** se considera éxito.
- La no recuperación por condiciones de mercado **no es un fallo del producto**.

---

## 4. Horizonte temporal

- **Largo plazo (1+ años)**.
- Permanecer atrapado durante meses es:
  - aceptado,
  - esperado,
  - y explícitamente documentado como riesgo.

---

## 5. Alcance del producto

### 5.1 Qué SÍ hace el bot
- Opera **spot únicamente**.
- Un bot opera **un solo par**.
- Capital lógico **aislado por bot**.
- Múltiples bots simultáneos en la misma cuenta.
- Compra solo tras caídas.
- Vende solo por take-profit.
- Reinicia ciclos automáticamente.
- Permite:
  - pausar / reanudar,
  - inyectar capital,
  - apagar bots individuales.
- Incluye **notificaciones operativas básicas**.

**Modelo operativo**
Las acciones de control (`start`, `pause`, `resume`, `terminate`) no ejecutan lógica de trading de forma directa.
Cada acción se registra como un comando persistido que será procesado de manera asíncrona por el worker del sistema,
garantizando desacople entre la API y la ejecución de la estrategia.

### 5.2 Qué NO hace el bot (out of scope radical)
Queda explícitamente fuera:
- Stop-loss (cualquier tipo)
- Trailing take-profit
- Indicadores técnicos (RSI, MA, etc.)
- Rebalanceos
- Reasignación automática de capital
- Optimización de parámetros
- Lógica dinámica por volatilidad
- Backtesting avanzado
- Simulación histórica
- Multi-exchange
- Optimización fiscal
- Retiros
- Dashboards complejos
- Auto-tuning
- IA / ML

---

## 6. Activos y pares permitidos

- **Capital base:** stablecoins únicamente  
  - Permitidas: USDT, USDC
- **Pares permitidos:**
  - BTC / stablecoin
  - ETH / stablecoin
  - BNB / stablecoin

---

## 7. Estrategia de trading

### 7.1 Ciclos
Un ciclo consiste en:
```
0 compras iniciales
→ hasta 5 compras regulares
→ 1 compra de extensión (opcional)
→ 1 venta por take-profit
```

### 7.2 Precio de referencia
**Referencia inicial:** precio de mercado al crear el bot.

**Referencia dinámica (antes de la primera compra):**
Mientras no haya compras:
```
precio_actual ≥ referencia_vigente × (1 + X)
```
- X configurable por bot.
- Evaluación solo en tick / polling.
- No depende de tiempo, velas o medias.

**Después de la primera compra:**
- La referencia queda fijada al último precio de compra.

### 7.3 Compras regulares
- Máximo 5 por ciclo.
- Drop fijo desde la referencia vigente.
- Compras crecientes sobre capital inicial:
  - 10 %, 12 %, 14 %, 16 %, 18 %
- Capital máximo usado: 70 %.

### 7.4 Compra de extensión
- Máx. 1 por ciclo.
- Se activa al −10 % desde la última compra regular.
- Usa el 100 % del capital líquido.
- No usa referencia dinámica.

### 7.5 Precio promedio
- Solo fills reales.
- Ponderado por cantidad.
- Incluye capital inyectado usado.

### 7.6 Take-profit
- Activación:
```
precio_actual ≥ precio_promedio × 1.08
```
- Venta del 100 % por orden de mercado.

### 7.7 Post-venta
- Inicio automático de nuevo ciclo.


### 7.8 Estrategia de ejecución de órdenes (técnica)

#### Compras
- Todas las compras del bot se ejecutan mediante **órdenes LIMIT**.
- Se utiliza **timeInForce = GTC (Good-Til-Canceled)**.
- El objetivo es:
  - permanecer en el libro de órdenes,
  - controlar el precio de ejecución,
  - y evitar slippage propio de órdenes MARKET.

#### Manejo de fills parciales
- Los **fills parciales están permitidos** y se consideran compras válidas.
- El **precio promedio del ciclo** se calcula **exclusivamente con fills reales ejecutados**.
- Ante la detección de un fill parcial:
  - el remanente de la orden LIMIT **se cancela explícitamente**,
  - el capital no utilizado **permanece como cash disponible**.

**Reconciliación tras cancelación**

La cancelación del remanente de una orden LIMIT debe considerarse una operación **idempotente y reconciliable**.
El sistema debe asumir que, debido a condiciones de red o latencia del exchange:

- la solicitud de cancelación puede fallar,
- la orden puede completarse total o parcialmente mientras se solicita la cancelación,
- pueden recibirse múltiples reportes de ejecución para una misma orden.

En todos los casos, el estado final de la orden y los fills reales ejecutados **se determinan exclusivamente
mediante la reconciliación con el estado reportado por el exchange**, y el cálculo de posición y precio promedio
se basa únicamente en los fills efectivamente ejecutados.

- el capital no utilizado **permanece como cash disponible**.
- El capital no utilizado puede emplearse posteriormente en:
  - compras regulares siguientes, o
  - la compra de extensión, según corresponda.

#### Qué se evita explícitamente
- **Órdenes MARKET para compras**, para reducir:
  - slippage,
  - ejecuciones a precios peores al objetivo.
- **timeInForce = FOK**, ya que:
  - no permite órdenes en espera (“resting”),
  - cancela inmediatamente si no hay liquidez suficiente al momento de enviar la orden.

#### Venta por take-profit
- La venta por take-profit **se mantiene como orden MARKET**.
- Se prioriza:
  - certeza de salida,
  - simplicidad operativa,
  - cierre inmediato del ciclo.


---

## 8. Gestión de capital

### Capital inicial
- Definido una sola vez.
- Inmutable.
- Referencia única de éxito.

### Capital total aportado
- Capital inicial + inyecciones.
- Uso operativo únicamente.

### Ganancias realizadas
- Permanecen dentro del bot.
- Uso contable.
- Retiros fuera de alcance.

---

## 9. Estados del bot
- idle
- active
- trapped
- paused
- completed (hito informativo)
- terminated

### Estado: trapped

El bot se considera en estado `trapped` cuando queda imposibilitado de continuar la estrategia bajo las reglas definidas.

**Definición operativa**

Un bot entra en estado `trapped` cuando se cumplen simultáneamente todas las siguientes condiciones:

1. El cash disponible es insuficiente para ejecutar cualquier compra válida según las reglas del exchange
   (ej. `cash_available < min_order_size` del par configurado).
2. Existe una posición abierta (`position_qty > 0`).
3. No existe ninguna acción adicional definida por la estrategia, excepto esperar un posible take-profit.

Este estado es terminal para el ciclo actual y representa un riesgo aceptado del POC.

---

## 10. Métricas

### Métrica primaria
- % del capital inicial recuperado.

### Métricas secundarias
- ROI total realizado
- Capital en riesgo
- Tiempo total atrapado

---

## 11. Riesgos aceptados
- Estar atrapado indefinidamente
- Uso prolongado de capital sin retorno
- Caídas >50 %
- Recuperación lenta
- Erosión por fees
- No superar buy & hold

---

## 12. Notificaciones
Incluidas:
- Inicio / parada del bot
- Compras (incluye fills parciales)
- Actualización de referencia
- Take-profit ejecutado
- Entrada / salida estado trapped
- Entrada / salida de modo degradado (degraded_mode)

**Nota:** El estado `trapped` no tiene “salida” definida en este PRD.

---

## 13. Supuestos del sistema
- Exchange spot funcional
- Liquidez suficiente
- APIs estables
- Operación 24/7
- Downtime aceptado

---

## 14. Entregables
- PRD final
- Estados y transiciones
- Reglas de trading
- Modelo de capital
- Métricas
- Riesgos aceptados

---

## 15. Cierre del PRD

Este PRD se considera terminado cuando define de forma completa, consistente y sin ambigüedades las reglas de operación, estados, métricas, riesgos aceptados y límites de alcance del bot, permitiendo su implementación técnica sin decisiones adicionales de producto, y se entrega en formato Markdown.
