import { expect, it } from "vitest";

import { InvalidArgumentError } from "../errors/domain-error.js";
import { UuidV7 } from "./uuidv7.js";

const SAMPLE_V7 = "00000000-0000-7000-8000-000000000000";

it("parse accepts valid UUIDv7 and normalizes to lowercase", () => {
  const u = UuidV7.parse("00000000-0000-7000-8000-000000000000");
  expect(u.toString()).toBe(SAMPLE_V7);
  const u2 = UuidV7.parse("00000000-0000-7000-8000-000000000000".toUpperCase());
  expect(u2.toString()).toBe(SAMPLE_V7);
});

it("toString is stable across calls", () => {
  const u = UuidV7.parse(SAMPLE_V7);
  expect(u.toString()).toBe(u.toString());
});

it("equals compares canonical value", () => {
  const a = UuidV7.parse(SAMPLE_V7);
  const b = UuidV7.parse("00000000-0000-7000-8000-000000000000");
  expect(a.equals(b)).toBe(true);
  const c = UuidV7.parse("00000000-0000-7000-8000-000000000001");
  expect(a.equals(c)).toBe(false);
});

it("rejects non-UUIDv7 strings", () => {
  for (const bad of [
    "",
    "nope",
    "00000000-0000-4000-8000-000000000000",
    "00000000-0000-7000-5000-000000000000",
    "g0000000-0000-7000-8000-000000000000"
  ]) {
    expect(() => UuidV7.parse(bad)).toThrow(InvalidArgumentError);
  }
});

it("trims input", () => {
  const u = UuidV7.parse(`  ${SAMPLE_V7}  `);
  expect(u.toString()).toBe(SAMPLE_V7);
});
