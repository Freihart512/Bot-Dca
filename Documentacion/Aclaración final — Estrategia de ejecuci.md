Aclaración final — Estrategia de ejecución de órdenes (ADR)
Decisión tomada
Las compras del bot se ejecutan mediante órdenes LIMIT con timeInForce=GTC, con el objetivo de permanecer en el libro de órdenes y controlar el precio de ejecución, evitando slippage propio de órdenes de mercado.
Manejo de fills parciales
* Los fills parciales son aceptados y se consideran compras válidas.
* El precio promedio del ciclo se calcula exclusivamente con fills reales.
* Tras detectarse un fill parcial, el remanente de la orden se cancela explícitamente.
* El capital no utilizado permanece como cash disponible, pudiendo utilizarse en:
    * compras regulares posteriores, o
    * la compra de extensión, según corresponda.
Qué se evita explícitamente
* Órdenes MARKET para compras, para reducir slippage y ejecuciones a precios peores al objetivo.
* timeInForce=FOK, ya que no permite órdenes en espera (“resting”) y se cancela inmediatamente si no hay liquidez al momento de enviar la orden.
Venta por take-profit
* La venta por TP se mantiene como orden MARKET, priorizando certeza de salida y simplicidad operativa.
Alcance de la decisión
* Esta es una decisión de arquitectura (ADR).
* No modifica las reglas de trading definidas en el PRD.
* Afecta únicamente a la estrategia de ejecución técnica.
