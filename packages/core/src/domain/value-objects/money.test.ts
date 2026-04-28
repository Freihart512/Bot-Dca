import { expect, it } from "vitest";

import { InvalidArgumentError } from "../errors/domain-error.js";
import { Money, parseDecimalStringToMinor } from "./money.js";

it("add same currency and fromDecimalString round-trips toDecimalString", () => {
  const a = Money.fromDecimalString("10.5", "USDT");
  const b = Money.fromDecimalString("0.25", "USDT");
  const s = a.add(b);
  expect(s.currency).toBe("USDT");
  expect(s.toDecimalString()).toBe("10.75");
});

it("add throws on currency mismatch", () => {
  const a = Money.fromDecimalString("1", "USDT");
  const b = Money.fromDecimalString("1", "USDC");
  expect(() => a.add(b)).toThrow(InvalidArgumentError);
});

it("subtract and compare", () => {
  const a = Money.fromDecimalString("3", "USDC");
  const b = Money.fromDecimalString("1", "USDC");
  const d = a.subtract(b);
  expect(d.toDecimalString()).toBe("2");
  expect(a.compare(b)).toBe(1);
  expect(b.compare(a)).toBe(-1);
  expect(d.compare(Money.fromDecimalString("2", "USDC"))).toBe(0);
});

it("subtract throws if result would be negative", () => {
  const a = Money.fromDecimalString("1", "USDT");
  const b = Money.fromDecimalString("2", "USDT");
  expect(() => a.subtract(b)).toThrow(InvalidArgumentError);
});

it("multiply truncates toward zero", () => {
  const a = Money.fromDecimalString("10", "USDT");
  const p = a.multiply("0.1");
  expect(p.toDecimalString()).toBe("1");
  const q = Money.fromDecimalString("0.33", "USDT").multiply("0.1");
  expect(q.toDecimalString()).toBe("0.033");
  expect(Money.fromDecimalString("0.1", "USDT").multiply("0.1").toDecimalString()).toBe("0.01");
});

it("fromMinorUnits and zero", () => {
  const z = Money.zero("USDT");
  expect(z.isZero()).toBe(true);
  const o = Money.fromMinorUnits(1n, "USDC");
  expect(o.toDecimalString()).toBe("0.00000001");
});

it("parseDecimalStringToMinor rejects invalid input", () => {
  expect(() => parseDecimalStringToMinor("")).toThrow(InvalidArgumentError);
  expect(() => parseDecimalStringToMinor("-1")).toThrow(InvalidArgumentError);
  expect(() => parseDecimalStringToMinor("1.2.3")).toThrow(InvalidArgumentError);
  expect(() => parseDecimalStringToMinor("0.000000001")).toThrow(InvalidArgumentError);
});

it("equals same amount and currency", () => {
  const x = Money.fromDecimalString("1", "USDT");
  const y = Money.fromDecimalString("1.0", "USDT");
  expect(x.equals(y)).toBe(true);
  expect(x.equals(Money.fromDecimalString("1", "USDC"))).toBe(false);
});
