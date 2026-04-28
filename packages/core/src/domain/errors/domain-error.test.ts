import { expect, it } from "vitest";

import { DomainErrorCode } from "./codes.js";
import {
  ConflictError,
  DomainError,
  InvariantViolationError,
  InvalidArgumentError,
  NotFoundError
} from "./domain-error.js";

it("DomainError.toSerializable returns code and message only", () => {
  const err = new DomainError(DomainErrorCode.INVARIANT_VIOLATION, "bad state");
  const payload = err.toSerializable();
  expect(payload).toEqual({
    code: DomainErrorCode.INVARIANT_VIOLATION,
    message: "bad state"
  });
  expect("stack" in payload).toBe(false);
  expect(JSON.stringify(payload)).toBe(
    JSON.stringify({ code: payload.code, message: payload.message })
  );
});

it("subtypes have fixed codes and names", () => {
  const inv = new InvalidArgumentError("x");
  expect(inv.code).toBe(DomainErrorCode.INVALID_ARGUMENT);
  expect(inv.name).toBe("InvalidArgumentError");

  const inv2 = new InvariantViolationError("y");
  expect(inv2.code).toBe(DomainErrorCode.INVARIANT_VIOLATION);

  const c = new ConflictError("z");
  expect(c.code).toBe(DomainErrorCode.CONFLICT);

  const n = new NotFoundError("w");
  expect(n.code).toBe(DomainErrorCode.NOT_FOUND);
});

it("toSerializable is stable for API-style JSON", () => {
  const err = new NotFoundError("entity");
  const s = JSON.stringify(err.toSerializable());
  expect(s).toBe(`{"code":"${DomainErrorCode.NOT_FOUND}","message":"entity"}`);
});
