import assert from "node:assert/strict";
import { test } from "node:test";

import Unauthorized from "./unauthorized.ts";

test("unauthorized error has correct status code", () => {
  const error = new Unauthorized();

  assert.deepStrictEqual(error.status, 401);
});

test("unauthorized error has correct name", () => {
  const error = new Unauthorized();

  assert.deepStrictEqual(error.name, "Unauthorized");
});

test("unauthorized error has default message", () => {
  const error = new Unauthorized();

  assert.deepStrictEqual(error.message, "Authentication required");
});

test("unauthorized error accepts custom message", () => {
  const error = new Unauthorized("Invalid token");

  assert.deepStrictEqual(error.message, "Invalid token");
});
