import assert from "node:assert/strict";
import { test } from "node:test";

import RequestTimeout from "./request-timeout.ts";

test("request timeout error has correct status code", () => {
  const error = new RequestTimeout();

  assert.deepStrictEqual(error.status, 408);
});

test("request timeout error has correct name", () => {
  const error = new RequestTimeout();

  assert.deepStrictEqual(error.name, "Request Timeout");
});

test("request timeout error has default message", () => {
  const error = new RequestTimeout();

  assert.deepStrictEqual(error.message, "Server timed out waiting for request");
});

test("request timeout error accepts custom message", () => {
  const error = new RequestTimeout("Request took too long");

  assert.deepStrictEqual(error.message, "Request took too long");
});
