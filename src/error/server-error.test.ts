import assert from "node:assert/strict";
import { test } from "node:test";

import ServerError from "./server-error.ts";

test("server error has correct status code", () => {
  const error = new ServerError();

  assert.deepStrictEqual(error.status, 500);
});

test("server error has correct name", () => {
  const error = new ServerError();

  assert.deepStrictEqual(error.name, "Server Error");
});

test("server error has default message", () => {
  const error = new ServerError();

  assert.deepStrictEqual(
    error.message,
    "There was an unexpected error handling your request",
  );
});

test("server error accepts custom message", () => {
  const error = new ServerError("Database connection failed");

  assert.deepStrictEqual(error.message, "Database connection failed");
});
