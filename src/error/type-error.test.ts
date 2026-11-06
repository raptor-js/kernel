import assert from "node:assert/strict";
import { test } from "node:test";

import TypeError from "./type-error.ts";

test("type error has correct status code", () => {
  const error = new TypeError();

  assert.deepStrictEqual(error.status, 500);
});

test("type error has correct name", () => {
  const error = new TypeError();

  assert.deepStrictEqual(error.name, "Type Error");
});

test("type error has default message", () => {
  const error = new TypeError();

  assert.deepStrictEqual(
    error.message,
    "There was a problem running the application code",
  );
});

test("type error accepts custom message", () => {
  const error = new TypeError("Invalid type passed to function");

  assert.deepStrictEqual(error.message, "Invalid type passed to function");
});
