import assert from "node:assert/strict";
import { test } from "node:test";

import MethodNotAllowed from "./method-not-allowed.ts";

test("method not allowed error has correct status code", () => {
  const error = new MethodNotAllowed();

  assert.deepStrictEqual(error.status, 405);
});

test("method not allowed error has correct name", () => {
  const error = new MethodNotAllowed();

  assert.deepStrictEqual(error.name, "Method Not Allowed");
});

test("method not allowed error has default message", () => {
  const error = new MethodNotAllowed();

  assert.deepStrictEqual(error.message, "Request method not permitted");
});

test("method not allowed error accepts custom message", () => {
  const error = new MethodNotAllowed("POST not allowed on this resource");

  assert.deepStrictEqual(error.message, "POST not allowed on this resource");
});
