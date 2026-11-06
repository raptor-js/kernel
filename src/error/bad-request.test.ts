import assert from "node:assert/strict";
import { test } from "node:test";

import BadRequest from "./bad-request.ts";

test("bad request error has correct status code", () => {
  const error = new BadRequest(["Error 1"]);

  assert.deepStrictEqual(error.status, 400);
});

test("bad request error has correct name", () => {
  const error = new BadRequest(["Error 1"]);

  assert.deepStrictEqual(error.name, "Bad Request");
});

test("bad request error has default message", () => {
  const error = new BadRequest(["Error 1"]);

  assert.deepStrictEqual(
    error.message,
    "There was an issue handling your request",
  );
});

test("bad request error accepts custom message", () => {
  const error = new BadRequest(["Error 1"], "Custom message");

  assert.deepStrictEqual(error.message, "Custom message");
});

test("bad request error stores errors array", () => {
  const errors = ["Error 1", "Error 2", "Error 3"];
  const error = new BadRequest(errors);

  assert.deepStrictEqual(error.errors, errors);
});

test("bad request error is instanceof Error", () => {
  const error = new BadRequest(["Error 1"]);

  assert.deepStrictEqual(error instanceof Error, true);
});
