# BACKLOG FUNCIONAL — BOT SPOT DCA + TP

**Versión:** v2 (alineado con PRD v1.0 y ADR v2)  
**Fuente única de verdad:** PRD — Bot de Trading Spot DCA + Take-Profit (bloqueado) + ADR — Arquitectura del Bot de Trading Spot v2

---

## 1. Casos de Uso (Use Cases)

### UC-01 — Crear bot de trading spot DCA
**Descripción:** Permite crear un bot con parámetros fijos definidos en el PRD para operar un único par spot.  
**Actor:** Usuario

---

### UC-02 — Iniciar bot
**Descripción:** Activa un bot creado para comenzar la evaluación continua del mercado.  
**Actor:** Usuario

---

### UC-03 — Actualizar referencia dinámica pre-compra
**Descripción:** Ajusta la referencia de precio mientras no existan compras ejecutadas, según la regla de referencia dinámica definida en el PRD.  
**Actor:** Sistema

---

### UC-04 — Ejecutar compra regular
**Descripción:** Ejecuta una compra DCA mediante **orden LIMIT con timeInForce=GTC**, aceptando fills parciales y cancelando el remanente tras la ejecución.  
**Actor:** Sistema

---

### UC-05 — Ejecutar compra de extensión
**Descripción:** Ejecuta una única compra adicional extrema mediante **orden LIMIT con timeInForce=GTC**, usando el capital líquido disponible, aceptando fills parciales y cancelando el remanente tras la ejecución.  
**Actor:** Sistema

---

### UC-06 — Calcular precio promedio
**Descripción:** Calcula el precio promedio ponderado utilizando **exclusivamente fills reales ejecutados**, incluyendo capital inyectado efectivamente utilizado.  
**Actor:** Sistema

---

### UC-06A — Manejar fill parcial de orden de compra
**Descripción:** Gestiona un fill parcial como ejecución válida, cancela explícitamente el remanente de la orden LIMIT y deja el capital no utilizado como cash disponible para operaciones posteriores.  
**Actor:** Sistema

---

### UC-06B — Cancelar remanente de orden LIMIT
**Descripción:** Cancela explícitamente el remanente pendiente de una orden LIMIT tras detectarse un fill parcial.  
**Actor:** Sistema

---

### UC-07 — Ejecutar take-profit
**Descripción:** Vende el 100 % de la posición mediante una **orden MARKET** al alcanzarse el umbral de take-profit definido.  
**Actor:** Sistema

---

### UC-08 — Reiniciar ciclo automáticamente
**Descripción:** Inicia automáticamente un nuevo ciclo de trading tras la ejecución exitosa de un take-profit.  
**Actor:** Sistema

---

### UC-09 — Pausar bot
**Descripción:** Detiene temporalmente la operativa del bot sin perder su estado interno.  
**Actor:** Usuario

---

### UC-10 — Reanudar bot
**Descripción:** Reactiva un bot previamente pausado, retomando la evaluación del mercado.  
**Actor:** Usuario

---

### UC-11 — Inyectar capital
**Descripción:** Permite añadir capital operativo adicional al bot, que podrá ser utilizado en compras futuras del ciclo.  
**Actor:** Usuario

---

### UC-12 — Cambiar estado a trapped
**Descripción:** Marca el bot como atrapado cuando se agota el capital disponible sin alcanzarse el take-profit.  
**Actor:** Sistema

---

### UC-13 — Finalizar bot
**Descripción:** Apaga definitivamente un bot, deteniendo toda su operativa futura.  
**Actor:** Usuario

---

### UC-14 — Emitir notificaciones operativas
**Descripción:** Emite notificaciones ante eventos clave del bot (compras, fills parciales, actualización de referencia, take-profit, estado trapped, modo degradado).  
**Actor:** Sistema

---

## 2. User Stories (con referencia a Casos de Uso)

### US-01 — Crear bot spot DCA
Como usuario  
Quiero crear un bot spot con capital inicial fijo  
Para iniciar una estrategia DCA defensiva  
**Relacionado con:** UC-01

---

### US-02 — Activar bot
Como usuario  
Quiero iniciar un bot creado  
Para que comience a evaluar condiciones de mercado  
**Relacionado con:** UC-02

---

### US-03 — Ajustar referencia dinámica
Como sistema  
Quiero actualizar la referencia antes de ejecutar la primera compra  
Para no quedar inactivo en mercados alcistas  
**Relacionado con:** UC-03

---

### US-04 — Ejecutar compras DCA
Como sistema  
Quiero ejecutar compras regulares mediante órdenes LIMIT con GTC  
Para construir posición controlando el precio de entrada  
**Relacionado con:** UC-04

---

### US-05 — Ejecutar compra de extensión
Como sistema  
Quiero ejecutar una compra de extensión usando el capital disponible  
Para maximizar la exposición según la estrategia definida  
**Relacionado con:** UC-05

---

### US-06 — Calcular precio promedio real
Como sistema  
Quiero calcular el precio promedio usando solo fills reales  
Para evaluar correctamente el take-profit  
**Relacionado con:** UC-06

---

### US-06A — Manejar fills parciales
Como sistema  
Quiero aceptar y procesar fills parciales como ejecuciones válidas  
Para reflejar correctamente el capital ejecutado y el cash disponible  
**Relacionado con:** UC-06A

---

### US-06B — Cancelar remanente de orden
Como sistema  
Quiero cancelar el remanente de una orden LIMIT tras un fill parcial  
Para evitar ejecuciones no deseadas posteriores  
**Relacionado con:** UC-06B

---

### US-07 — Ejecutar take-profit
Como sistema  
Quiero vender toda la posición mediante una orden MARKET al alcanzar el TP  
Para asegurar el cierre completo del ciclo con ganancias realizadas  
**Relacionado con:** UC-07

---

### US-08 — Reiniciar ciclo
Como sistema  
Quiero reiniciar el ciclo tras un take-profit  
Para continuar operando automáticamente  
**Relacionado con:** UC-08

---

### US-09 — Pausar bot
Como usuario  
Quiero pausar el bot  
Para detener temporalmente su operativa  
**Relacionado con:** UC-09

---

### US-10 — Reanudar bot
Como usuario  
Quiero reanudar un bot pausado  
Para continuar su operación  
**Relacionado con:** UC-10

---

### US-11 — Inyectar capital
Como usuario  
Quiero añadir capital al bot  
Para extender su capacidad operativa  
**Relacionado con:** UC-11

---

### US-12 — Marcar bot como trapped
Como sistema  
Quiero marcar el bot como atrapado  
Para reflejar explícitamente el riesgo asumido  
**Relacionado con:** UC-12

---

### US-13 — Apagar bot
Como usuario  
Quiero apagar un bot  
Para finalizar definitivamente su operación  
**Relacionado con:** UC-13

---

### US-14 — Recibir notificaciones
Como usuario  
Quiero recibir notificaciones operativas del bot  
Para estar informado de su comportamiento y eventos relevantes  
**Relacionado con:** UC-14

---

## Estado del backlog

Backlog funcional cerrado, consistente y completamente alineado con el PRD y ADR vigentes.  
No requiere decisiones adicionales de producto ni de ejecución técnica.

