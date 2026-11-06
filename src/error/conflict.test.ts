import assert from "node:assert/strict";
import { test } from "node:test";

import Conflict from "./conflict.ts";

test("conflict error has correct status code", () => {
  const error = new Conflict();

  assert.deepStrictEqual(error.status, 409);
});

test("conflict error has correct name", () => {
  const error = new Conflict();

  assert.deepStrictEqual(error.name, "Conflict");
});

test("conflict error has default message", () => {
  const error = new Conflict();

  assert.deepStrictEqual(error.message, "Resource already exists");
});

test("conflict error accepts custom message", () => {
  const error = new Conflict("Email already registered");

  assert.deepStrictEqual(error.message, "Email already registered");
});
