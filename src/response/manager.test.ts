import assert from "node:assert/strict";
import { test } from "node:test";

import Context from "../context.ts";
import DefaultResponseManager from "./manager.ts";

const APP_URL = "http://localhost:8000";

test("test response manager handles plain text HTTP response", async () => {
  const manager = new DefaultResponseManager();

  const response = await manager.process(
    "Test Successful",
    new Context(new Request(APP_URL), new Response()),
  );

  assert.deepStrictEqual(response.headers.get("content-type"), "text/plain");
  assert.deepStrictEqual(await response.text(), "Test Successful");
});

test("test kernel handles HTML HTTP response", async () => {
  const manager = new DefaultResponseManager();

  const response = await manager.process(
    "<h1>Test</h1>",
    new Context(new Request(APP_URL), new Response()),
  );

  assert.deepStrictEqual(response.headers.get("content-type"), "text/html");
  assert.deepStrictEqual(await response.text(), "<h1>Test</h1>");
});

test("test kernel handles circular JSON HTTP response as error", async () => {
  const manager = new DefaultResponseManager();

  const object: any = { name: "test" };

  object.self = object;

  try {
    await manager.process(
      object,
      new Context(new Request(APP_URL), new Response()),
    );
  } catch (error: any) {
    assert.deepStrictEqual(
      error.message,
      "There was a problem stringifying the JSON object.",
    );
  }
});

test("test kernel handles response object HTTP response", async () => {
  const manager = new DefaultResponseManager();

  const response = await manager.process(
    new Response("This is a test"),
    new Context(new Request(APP_URL), new Response()),
  );

  assert.deepStrictEqual(
    response.headers.get("content-type")?.includes("text/plain"),
    true,
  );
  assert.deepStrictEqual(await response.text(), "This is a test");
});
