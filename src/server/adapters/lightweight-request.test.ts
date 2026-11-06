import assert from "node:assert/strict";
import { test } from "node:test";

// A getter added before the module loads, the way the validator patches Request on import.
const perRequest = Symbol("per request");

Object.defineProperty(Request.prototype, "perRequestValue", {
  configurable: true,
  get(this: Record<symbol, unknown>) {
    return this[perRequest];
  },
});

const { createLightweightRequest } = await import("./lightweight-request.ts");

test("lightweight request runs getters added to Request.prototype on itself", () => {
  const request = createLightweightRequest(
    { method: "GET", headers: {} },
    "http://localhost:8000/",
  ) as Request & Record<symbol, unknown> & { perRequestValue?: unknown };

  request[perRequest] = "set on this request";

  assert.deepStrictEqual(request.perRequestValue, "set on this request");
});

const nodeRequest = (method: string, headers: Record<string, string>) => ({
  method,
  headers,
});

test("lightweight request is an instance of Request", () => {
  const request = createLightweightRequest(
    nodeRequest("GET", {}),
    "http://localhost:8000/",
  );

  assert.ok(request instanceof Request);
});

test("lightweight request answers its method, url and headers", () => {
  const request = createLightweightRequest(
    nodeRequest("PATCH", { "x-test": "yes" }),
    "http://localhost:8000/users?page=2",
  );

  assert.deepStrictEqual(request.method, "PATCH");
  assert.deepStrictEqual(request.url, "http://localhost:8000/users?page=2");
  assert.deepStrictEqual(request.headers.get("X-Test"), "yes");
  assert.strictEqual(request.headers, request.headers);
});

test("lightweight request reads its body through a real request", async () => {
  const request = createLightweightRequest(
    nodeRequest("POST", { "content-type": "application/json" }),
    "http://localhost:8000/",
    () => new Response('{"name":"raptor"}').body ?? undefined,
  );

  assert.deepStrictEqual(await request.json(), { name: "raptor" });
  assert.deepStrictEqual(request.bodyUsed, true);
});

test("lightweight request clones into a real request", async () => {
  const request = createLightweightRequest(
    nodeRequest("POST", {}),
    "http://localhost:8000/",
    () => new Response("hello").body ?? undefined,
  );

  const clone = request.clone();

  assert.deepStrictEqual(await clone.text(), "hello");
  assert.deepStrictEqual(await request.text(), "hello");
});

test("lightweight request reaches methods added to Request.prototype", () => {
  Object.defineProperty(Request.prototype, "describe", {
    configurable: true,
    value(this: Request) {
      return `${this.method} ${this.url}`;
    },
  });

  const request = createLightweightRequest(
    nodeRequest("GET", {}),
    "http://localhost:8000/",
  ) as Request & { describe(): string };

  assert.deepStrictEqual(request.describe(), "GET http://localhost:8000/");

  Reflect.deleteProperty(Request.prototype, "describe");
});

test("lightweight request takes properties set on it", () => {
  const request = createLightweightRequest(
    nodeRequest("GET", {}),
    "http://localhost:8000/",
  ) as Request & { params?: Record<string, string> };

  request.params = { id: "1" };

  assert.deepStrictEqual(request.params, { id: "1" });
});
