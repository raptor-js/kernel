import assert from "node:assert/strict";
import { test } from "node:test";

import NotAcceptable from "./not-acceptable.ts";

test("not acceptable error has correct status code", () => {
  const error = new NotAcceptable();

  assert.deepStrictEqual(error.status, 406);
});

test("not acceptable error has correct name", () => {
  const error = new NotAcceptable();

  assert.deepStrictEqual(error.name, "Not Acceptable");
});

test("not acceptable error has default message", () => {
  const error = new NotAcceptable();

  assert.deepStrictEqual(
    error.message,
    "Resource can't return requested format",
  );
});

test("not acceptable error accepts custom message", () => {
  const error = new NotAcceptable("Only JSON supported");

  assert.deepStrictEqual(error.message, "Only JSON supported");
});
