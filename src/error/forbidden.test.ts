import assert from "node:assert/strict";
import { test } from "node:test";

import Forbidden from "./forbidden.ts";

test("forbidden error has correct status code", () => {
  const error = new Forbidden();

  assert.deepStrictEqual(error.status, 403);
});

test("forbidden error has correct name", () => {
  const error = new Forbidden();

  assert.deepStrictEqual(error.name, "Forbidden");
});

test("forbidden error has default message", () => {
  const error = new Forbidden();

  assert.deepStrictEqual(error.message, "Server refused request");
});

test("forbidden error accepts custom message", () => {
  const error = new Forbidden("Insufficient permissions");

  assert.deepStrictEqual(error.message, "Insufficient permissions");
});
