import assert from "node:assert/strict";
import { test } from "node:test";

import ImATeapot from "./im-a-teapot.ts";

test("im a teapot error has correct status code", () => {
  const error = new ImATeapot();

  assert.deepStrictEqual(error.status, 418);
});

test("im a teapot error has correct name", () => {
  const error = new ImATeapot();

  assert.deepStrictEqual(error.name, "I'm a Teapot");
});

test("im a teapot error has default message", () => {
  const error = new ImATeapot();

  assert.deepStrictEqual(error.message, "Yes, you are.");
});

test("im a teapot error accepts custom message", () => {
  const error = new ImATeapot("I cannot brew coffee");

  assert.deepStrictEqual(error.message, "I cannot brew coffee");
});
