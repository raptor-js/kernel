import assert from "node:assert/strict";
import { test } from "node:test";

import UnprocessableEntity from "./unprocessable-entity.ts";

test("unprocessable entity error has correct status code", () => {
  const error = new UnprocessableEntity({});

  assert.deepStrictEqual(error.status, 422);
});

test("unprocessable entity error has correct name", () => {
  const error = new UnprocessableEntity({});

  assert.deepStrictEqual(error.name, "Unprocessable Entity");
});

test("unprocessable entity error has default message", () => {
  const error = new UnprocessableEntity({});

  assert.deepStrictEqual(error.message, "Semantic errors in request");
});

test("unprocessable entity error accepts custom message", () => {
  const error = new UnprocessableEntity({}, "Validation failed");

  assert.deepStrictEqual(error.message, "Validation failed");
});

test("unprocessable entity error stores errors object", () => {
  const errors = {
    email: ["Invalid format", "Already taken"],
    password: ["Too short"],
  };
  const error = new UnprocessableEntity(errors);

  assert.deepStrictEqual(error.errors, errors);
});

test("unprocessable entity error handles empty errors object", () => {
  const error = new UnprocessableEntity({});

  assert.deepStrictEqual(error.errors, {});
});
