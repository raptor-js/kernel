import assert from "node:assert/strict";
import { test } from "node:test";

import Gone from "./gone.ts";

test("gone error has correct status code", () => {
  const error = new Gone();

  assert.deepStrictEqual(error.status, 410);
});

test("gone error has correct name", () => {
  const error = new Gone();

  assert.deepStrictEqual(error.name, "Gone");
});

test("gone error has default message", () => {
  const error = new Gone();

  assert.deepStrictEqual(error.message, "Resource no longer exists");
});

test("gone error accepts custom message", () => {
  const error = new Gone("This endpoint has been removed");

  assert.deepStrictEqual(error.message, "This endpoint has been removed");
});
