/**
 * Stable string codes for domain errors (logging, API mapping, tests).
 */
export const DomainErrorCode = {
  INVALID_ARGUMENT: "INVALID_ARGUMENT",
  INVARIANT_VIOLATION: "INVARIANT_VIOLATION",
  CONFLICT: "CONFLICT",
  NOT_FOUND: "NOT_FOUND"
} as const;

export type DomainErrorCodeString = (typeof DomainErrorCode)[keyof typeof DomainErrorCode];
