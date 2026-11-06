import assert from "node:assert/strict";
import { test } from "node:test";

import Kernel from "../kernel.ts";
import {
  createResponse,
  getRawBody,
  useLightweightResponses,
} from "./raw-body.ts";

// Turning lightweight responses on lasts for the process, which is this file alone.
useLightweightResponses();

test("lightweight response is an instance of Response", () => {
  assert.ok(createResponse("OK", { status: 200 }) instanceof Response);
});

test("lightweight response answers its status and headers", () => {
  const response = createResponse("Gone", {
    status: 410,
    statusText: "Gone",
    headers: { "content-type": "text/plain" },
  });

  assert.deepStrictEqual(response.status, 410);
  assert.deepStrictEqual(response.statusText, "Gone");
  assert.deepStrictEqual(response.ok, false);
  assert.deepStrictEqual(response.headers.get("content-type"), "text/plain");
});

test("lightweight response hands its text to the server adapter", () => {
  const response = createResponse("Hello", { status: 200 });

  assert.deepStrictEqual(getRawBody(response), "Hello");
  assert.deepStrictEqual(response.bodyUsed, false);
});

test("lightweight response reads its body through a real response", async () => {
  const response = createResponse('{"a":1}', { status: 200 });

  assert.deepStrictEqual(await response.json(), { a: 1 });
  assert.deepStrictEqual(response.bodyUsed, true);
  assert.deepStrictEqual(getRawBody(response), undefined);
});

test("lightweight response does not share headers with what it was made from", () => {
  const headers = new Headers({ "x-test": "before" });

  const response = createResponse("OK", { status: 200, headers });

  headers.set("x-test", "after");

  assert.deepStrictEqual(response.headers.get("x-test"), "before");
});

test("kernel middleware can read a lightweight response after next", async () => {
  const app = new Kernel();

  let seen = "";

  app.add(async (context, next) => {
    await next();

    seen = await context.response.clone().text();
  });

  app.add(() => "Test Successful");

  const response = await app.respond(new Request("http://localhost:8000/"));

  assert.deepStrictEqual(seen, "Test Successful");
  assert.deepStrictEqual(await response.text(), "Test Successful");
});
