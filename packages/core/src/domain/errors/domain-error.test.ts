import assert from "node:assert/strict";
import { test } from "node:test";

import { DomainErrorCode } from "./codes.js";
import {
  ConflictError,
  DomainError,
  InvariantViolationError,
  InvalidArgumentError,
  NotFoundError
} from "./domain-error.js";

test("DomainError.toSerializable returns code and message only", () => {
  const err = new DomainError(DomainErrorCode.INVARIANT_VIOLATION, "bad state");
  const payload = err.toSerializable();
  assert.deepEqual(payload, {
    code: DomainErrorCode.INVARIANT_VIOLATION,
    message: "bad state"
  });
  assert.equal("stack" in payload, false);
  assert.equal(
    JSON.stringify(payload),
    JSON.stringify({ code: payload.code, message: payload.message })
  );
});

test("subtypes have fixed codes and names", () => {
  const inv = new InvalidArgumentError("x");
  assert.equal(inv.code, DomainErrorCode.INVALID_ARGUMENT);
  assert.equal(inv.name, "InvalidArgumentError");

  const inv2 = new InvariantViolationError("y");
  assert.equal(inv2.code, DomainErrorCode.INVARIANT_VIOLATION);

  const c = new ConflictError("z");
  assert.equal(c.code, DomainErrorCode.CONFLICT);

  const n = new NotFoundError("w");
  assert.equal(n.code, DomainErrorCode.NOT_FOUND);
});

test("toSerializable is stable for API-style JSON", () => {
  const err = new NotFoundError("entity");
  const s = JSON.stringify(err.toSerializable());
  assert.equal(s, `{"code":"${DomainErrorCode.NOT_FOUND}","message":"entity"}`);
});
