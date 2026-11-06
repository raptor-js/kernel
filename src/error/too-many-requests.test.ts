import assert from "node:assert/strict";
import { test } from "node:test";

import TooManyRequests from "./too-many-requests.ts";

test("too many requests error has correct status code", () => {
  const error = new TooManyRequests();

  assert.deepStrictEqual(error.status, 429);
});

test("too many requests error has correct name", () => {
  const error = new TooManyRequests();

  assert.deepStrictEqual(error.name, "Too Many Requests");
});

test("too many requests error has default message", () => {
  const error = new TooManyRequests();

  assert.deepStrictEqual(
    error.message,
    "You have exceeded the maximum number of requests",
  );
});

test("too many requests error accepts custom message", () => {
  const error = new TooManyRequests("Rate limit: 100 requests per hour");

  assert.deepStrictEqual(error.message, "Rate limit: 100 requests per hour");
});
