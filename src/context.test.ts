import assert from "node:assert/strict";
import { test } from "node:test";

import Context from "../src/context.ts";

test("context detects when content-type is set on response", () => {
  const request = new Request("http://localhost");

  const response = new Response(null, {
    headers: { "content-type": "application/json" },
  });

  const context = new Context(request, response);

  assert.deepStrictEqual(context.hasContentType(), true);
});

test("context detects when content-type is not set on response", () => {
  const request = new Request("http://localhost");

  const response = new Response();

  const context = new Context(request, response);

  assert.deepStrictEqual(context.hasContentType(), false);
});

test("context caches hasContentType check", () => {
  const request = new Request("http://localhost");
  const response = new Response();

  const context = new Context(request, response);

  assert.deepStrictEqual(context.hasContentType(), false);

  response.headers.set("content-type", "text/plain");

  assert.deepStrictEqual(context.hasContentType(), false);
});
