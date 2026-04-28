import type { DomainErrorCodeString } from "./codes.js";
import { DomainErrorCode as Codes } from "./codes.js";

export type DomainErrorSerializable = {
  code: DomainErrorCodeString;
  message: string;
};

/**
 * Base error for domain and application invariants. No infrastructure dependencies.
 * Use {@link DomainError.prototype.toSerializable} for stable code/message payloads (stack optional).
 */
export class DomainError extends Error {
  readonly code: DomainErrorCodeString;

  constructor(code: DomainErrorCodeString, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "DomainError";
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toSerializable(): DomainErrorSerializable {
    return {
      code: this.code,
      message: this.message
    };
  }
}

export class InvalidArgumentError extends DomainError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(Codes.INVALID_ARGUMENT, message, options);
    this.name = "InvalidArgumentError";
  }
}

export class InvariantViolationError extends DomainError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(Codes.INVARIANT_VIOLATION, message, options);
    this.name = "InvariantViolationError";
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(Codes.CONFLICT, message, options);
    this.name = "ConflictError";
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(Codes.NOT_FOUND, message, options);
    this.name = "NotFoundError";
  }
}
