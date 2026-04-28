import assert from "node:assert/strict";
import { test } from "node:test";

import { InvalidArgumentError } from "../errors/domain-error.js";
import { UuidV7 } from "./uuidv7.js";

const SAMPLE_V7 = "00000000-0000-7000-8000-000000000000";

test("parse accepts valid UUIDv7 and normalizes to lowercase", () => {
  const u = UuidV7.parse("00000000-0000-7000-8000-000000000000");
  assert.equal(u.toString(), SAMPLE_V7);
  const u2 = UuidV7.parse("00000000-0000-7000-8000-000000000000".toUpperCase());
  assert.equal(u2.toString(), SAMPLE_V7);
});

test("toString is stable across calls", () => {
  const u = UuidV7.parse(SAMPLE_V7);
  assert.equal(u.toString(), u.toString());
});

test("equals compares canonical value", () => {
  const a = UuidV7.parse(SAMPLE_V7);
  const b = UuidV7.parse("00000000-0000-7000-8000-000000000000");
  assert.equal(a.equals(b), true);
  const c = UuidV7.parse("00000000-0000-7000-8000-000000000001");
  assert.equal(a.equals(c), false);
});

test("rejects non-UUIDv7 strings", () => {
  for (const bad of [
    "",
    "nope",
    "00000000-0000-4000-8000-000000000000",
    "00000000-0000-7000-5000-000000000000",
    "g0000000-0000-7000-8000-000000000000"
  ]) {
    assert.throws(() => UuidV7.parse(bad), InvalidArgumentError);
  }
});

test("trims input", () => {
  const u = UuidV7.parse(`  ${SAMPLE_V7}  `);
  assert.equal(u.toString(), SAMPLE_V7);
});
