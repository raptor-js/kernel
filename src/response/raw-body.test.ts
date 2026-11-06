import assert from "node:assert/strict";
import { test } from "node:test";

import { createResponse, getRawBody } from "./raw-body.ts";

test("raw body is the text a built-in response was made from", async () => {
  const response = createResponse("Hello", { status: 201 });

  assert.deepStrictEqual(getRawBody(response), "Hello");
  assert.deepStrictEqual(response.status, 201);
  assert.deepStrictEqual(await response.text(), "Hello");
});

test("raw body is gone once the body has been read", async () => {
  const response = createResponse("Hello", { status: 200 });

  await response.text();

  assert.deepStrictEqual(getRawBody(response), undefined);
});

test("raw body is unknown for a response made any other way", () => {
  assert.deepStrictEqual(getRawBody(new Response("Hello")), undefined);
});
