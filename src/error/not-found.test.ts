import assert from "node:assert/strict";
import { test } from "node:test";

import NotFound from "./not-found.ts";

test("not found ehas correct status code", () => {
  const error = new NotFound();

  assert.deepStrictEqual(error.status, 404);
});

test("not found ehas correct name", () => {
  const error = new NotFound();

  assert.deepStrictEqual(error.name, "Not Found");
});

test("not found ehas default message", () => {
  const error = new NotFound();

  assert.deepStrictEqual(
    error.message,
    "The resource requested could not be found",
  );
});

test("not found error accepts custom message", () => {
  const error = new NotFound("User not found");

  assert.deepStrictEqual(error.message, "User not found");
});
