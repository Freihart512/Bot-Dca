import { InvalidArgumentError } from "../errors/domain-error.js";

/** Stablecoins permitidas (PRD). */
export type Stablecoin = "USDT" | "USDC";

const SCALE_EXP = 8;
const SCALE = 10n ** BigInt(SCALE_EXP);

function assertNonNegativeMinor(name: string, v: bigint): void {
  if (v < 0n) {
    throw new InvalidArgumentError(`${name} must be non-negative`);
  }
}

/**
 * Convierte un entero en unidades mínimas a string decimal fijo (hasta 8 decimales, sin notación científica).
 */
function minorToDecimalString(minor: bigint): string {
  const sign = minor < 0n ? "-" : "";
  const abs = minor < 0n ? -minor : minor;
  const intPart = abs / SCALE;
  const frac = abs % SCALE;
  if (frac === 0n) {
    return `${sign}${intPart.toString()}`;
  }
  const fracStr = frac.toString().padStart(SCALE_EXP, "0").replace(/0+$/, "");
  return `${sign}${intPart.toString()}.${fracStr}`;
}

/**
 * Parsea un decimal no negativo con como máximo {@link SCALE_EXP} fracción a unidades mínimas.
 * No usa `number`; rechaza múltiples separadores, signos, ni espacios (salvo trim).
 */
export function parseDecimalStringToMinor(raw: string): bigint {
  const s = raw.trim();
  if (s.length === 0) {
    throw new InvalidArgumentError("amount string is empty");
  }
  if (s.startsWith("-")) {
    throw new InvalidArgumentError("amount must be non-negative");
  }
  const parts = s.split(".");
  if (parts.length > 2) {
    throw new InvalidArgumentError("invalid amount format");
  }
  const intPartRaw = parts[0] ?? "";
  const frac = parts[1] ?? "";
  if (intPartRaw.length === 0 && frac.length === 0) {
    throw new InvalidArgumentError("invalid amount format");
  }
  for (const ch of intPartRaw + frac) {
    if (ch < "0" || ch > "9") {
      throw new InvalidArgumentError("amount must be decimal digits only");
    }
  }
  if (frac.length > SCALE_EXP) {
    throw new InvalidArgumentError(`amount supports at most ${SCALE_EXP} decimal places`);
  }
  const intNorm = intPartRaw.length === 0 ? "0" : intPartRaw.replace(/^0+/, "") || "0";
  const intVal = BigInt(intNorm);
  const fracPadded = (frac + "0".repeat(SCALE_EXP)).slice(0, SCALE_EXP);
  const minor = intVal * SCALE + BigInt(fracPadded);
  return minor;
}

/**
 * Valor inmutable: cantidad (bigint en unidad mínima) + moneda. Sin `number` en el API público.
 * Escala: 1 unidad = 1e-8 de la stablecoin.
 */
export class Money {
  private constructor(
    readonly amountMinor: bigint,
    readonly currency: Stablecoin
  ) {
    assertNonNegativeMinor("amountMinor", amountMinor);
  }

  static zero(currency: Stablecoin): Money {
    return new Money(0n, currency);
  }

  /** Cantidad a partir de unidades mínimas (10⁻⁸). */
  static fromMinorUnits(amountMinor: bigint, currency: Stablecoin): Money {
    return new Money(amountMinor, currency);
  }

  /** Desde string decimal, ej. `"10.5"`. */
  static fromDecimalString(amount: string, currency: Stablecoin): Money {
    const minor = parseDecimalStringToMinor(amount);
    return new Money(minor, currency);
  }

  toDecimalString(): string {
    return minorToDecimalString(this.amountMinor);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other, "add");
    return new Money(this.amountMinor + other.amountMinor, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other, "subtract");
    const result = this.amountMinor - other.amountMinor;
    if (result < 0n) {
      throw new InvalidArgumentError("subtraction would be negative");
    }
    return new Money(result, this.currency);
  }

  /**
   * Multiplica por un factor decimal (ej. `"0.1"` = 10%). Resultado truncado hacia cero.
   */
  multiply(factorDecimal: string): Money {
    const factorMinor = parseDecimalStringToMinor(factorDecimal);
    const product = (this.amountMinor * factorMinor) / SCALE;
    return new Money(product, this.currency);
  }

  /**
   * Comparación: -1 si this &lt; other, 0 si iguales, 1 si this &gt; other.
   */
  compare(other: Money): -1 | 0 | 1 {
    this.assertSameCurrency(other, "compare");
    if (this.amountMinor < other.amountMinor) {
      return -1;
    }
    if (this.amountMinor > other.amountMinor) {
      return 1;
    }
    return 0;
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.amountMinor === other.amountMinor;
  }

  isZero(): boolean {
    return this.amountMinor === 0n;
  }

  private assertSameCurrency(other: Money, op: string): void {
    if (this.currency !== other.currency) {
      throw new InvalidArgumentError(
        `currency mismatch in ${op}: ${this.currency} vs ${other.currency}`
      );
    }
  }
}
