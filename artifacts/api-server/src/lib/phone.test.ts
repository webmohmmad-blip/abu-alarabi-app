/**
 * Phone-number validation tests.
 * Run with: node --import tsx/esm --test src/lib/phone.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validatePhone, PHONE_ERROR_AR } from "./phone.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

function assertValid(raw: string, expectedNormalized: string) {
  const result = validatePhone(raw);
  assert.equal(result.ok, true, `Expected "${raw}" to be valid`);
  if (result.ok) {
    assert.equal(result.phone, expectedNormalized);
  }
}

function assertInvalid(raw: string) {
  const result = validatePhone(raw);
  assert.equal(result.ok, false, `Expected "${raw}" to be invalid`);
  if (!result.ok) {
    assert.equal(result.error, PHONE_ERROR_AR);
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("validatePhone — valid Jordanian numbers", () => {
  it("accepts 077 prefix", () => assertValid("0771234567", "0771234567"));
  it("accepts 078 prefix", () => assertValid("0781234567", "0781234567"));
  it("accepts 079 prefix", () => assertValid("0791234567", "0791234567"));
});

describe("validatePhone — too short", () => {
  it("rejects 9 digits", () => assertInvalid("079123456"));
  it("rejects 8 digits", () => assertInvalid("07912345"));
  it("rejects 7 digits", () => assertInvalid("0791234"));
});

describe("validatePhone — too long", () => {
  it("rejects 11 digits", () => assertInvalid("07912345678"));
  it("rejects 12 digits", () => assertInvalid("079123456789"));
});

describe("validatePhone — invalid prefixes", () => {
  it("rejects 070", () => assertInvalid("0701234567"));
  it("rejects 071", () => assertInvalid("0711234567"));
  it("rejects 072", () => assertInvalid("0721234567"));
  it("rejects 073", () => assertInvalid("0731234567"));
  it("rejects 074", () => assertInvalid("0741234567"));
  it("rejects 075", () => assertInvalid("0751234567"));
  it("rejects 076", () => assertInvalid("0761234567"));
  it("rejects bare 7-prefix (9 digits, no leading 0)", () => assertInvalid("761234567"));
});

describe("validatePhone — letters", () => {
  it("rejects alphabetic input", () => assertInvalid("abcdefghij"));
  it("rejects mixed alpha-numeric that looks like 10 chars", () => assertInvalid("079abc4567"));
});

describe("validatePhone — symbols and spaces (stripped before check)", () => {
  it("rejects dashes (net digits < 10)", () => assertInvalid("079-123-456"));
  it("rejects spaces (net digits < 10)", () => assertInvalid("079 123 456"));
  // A number with dashes that resolves to 10 valid digits should pass
  it("accepts dashes that resolve to a valid 10-digit number", () =>
    assertValid("079-1234-567", "0791234567"));
  it("accepts spaces that resolve to a valid 10-digit number", () =>
    assertValid("079 1234 567", "0791234567"));
});

describe("validatePhone — country-code formats", () => {
  it("rejects +962 prefix (resolves to 12 digits)", () => assertInvalid("+962791234567"));
  it("rejects 00962 prefix", () => assertInvalid("00962791234567"));
  it("rejects 962 without leading +", () => assertInvalid("962791234567"));
});

describe("validatePhone — empty / null-ish", () => {
  it("rejects empty string", () => assertInvalid(""));
  it("rejects whitespace only", () => assertInvalid("   "));
});
