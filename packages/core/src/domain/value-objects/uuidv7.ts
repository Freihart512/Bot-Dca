import { InvalidArgumentError } from "../errors/domain-error.js";

/**
 * Lowercase canonical string: 8-4-4-4-12 hex, version nibble 7, RFC 4122 variant in 4th group.
 * @see RFC 9562 (UUID version 7)
 */
const UUIDV7_STRING = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Immutable ID value object for UUID version 7 (time-ordered).
 */
export class UuidV7 {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  /**
   * Parses and validates a UUIDv7 string. Normalizes to lowercase.
   * @throws {InvalidArgumentError} if the string is not a valid UUIDv7
   */
  static parse(input: string): UuidV7 {
    const s = input?.trim() ?? "";
    if (s.length === 0 || !UUIDV7_STRING.test(s)) {
      throw new InvalidArgumentError("expected a valid UUIDv7 string");
    }
    return new UuidV7(s.toLowerCase());
  }

  /**
   * Stable canonical form (lowercase hex with hyphens).
   */
  toString(): string {
    return this.value;
  }

  equals(other: UuidV7): boolean {
    return this.value === other.value;
  }
}
