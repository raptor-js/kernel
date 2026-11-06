import type { Context } from "@raptor-js/types";
import assert from "node:assert/strict";
import { test } from "node:test";

import Kernel from "./kernel.ts";
import NotFound from "./error/not-found.ts";
import BadRequest from "./error/bad-request.ts";
import ServerError from "./error/server-error.ts";
import DefaultServerManager from "./server/manager.ts";
import DefaultResponseManager from "./response/manager.ts";

const APP_URL = "http://localhost:8000";

// Kernel configuration options.

test("test kernel uses default configuration options.", async () => {
  const app = new Kernel();

  assert.deepStrictEqual(app.getConfig().strictContentNegotiation, false);
});

test("test kernel allows configuration options.", async () => {
  const app = new Kernel({
    strictContentNegotiation: true,
  });

  assert.deepStrictEqual(app.getConfig().strictContentNegotiation, true);
});

// Middleware Registration.

test("test kernel handles adding middleware", async () => {
  const app = new Kernel();

  app.add(() => "Test Successful");

  const response = await app.respond(new Request(APP_URL));

  assert.deepStrictEqual(await response.text(), "Test Successful");
});

test("test kernel handles adding middleware with config", async () => {
  const app = new Kernel({
    middleware: [() => "Test Successful"],
  });

  const response = await app.respond(new Request(APP_URL));

  assert.deepStrictEqual(await response.text(), "Test Successful");
});

test("test kernel handles alias method for adding middleware", async () => {
  const app = new Kernel();

  app.use(() => "Test Successful");

  const response = await app.respond(new Request(APP_URL));

  assert.deepStrictEqual(await response.text(), "Test Successful");
});

test("test middleware next callback functionality", async () => {
  const app = new Kernel();

  app.add(async (_ctx: Context, next: CallableFunction) => {
    await next();

    return "Hello from the first middleware";
  });

  app.add(() => {
    return "Hello from the second middleware";
  });

  const response = await app.respond(new Request(APP_URL));

  assert.deepStrictEqual(
    await response.text(),
    "Hello from the second middleware",
  );
});

// Context Manipulation.

test("test kernel updates middleware context", async () => {
  const app = new Kernel();

  app.add((ctx: Context) => {
    ctx.response.headers.set("content-type", "application/json");

    return "Hello, Dr Malcolm!";
  });

  const response = await app.respond(new Request(APP_URL));

  assert.deepStrictEqual(
    response.headers.get("content-type"),
    "application/json",
  );
});

// Error Handling - Generic Errors.

test("test kernel handles generic error with 500 status", async () => {
  const app = new Kernel();

  app.add(() => {
    throw new Error("Generic error");
  });

  const response = await app.respond(new Request(APP_URL));

  assert.deepStrictEqual(response.status, 500);
});

test("test kernel handles generic error status in JSON response", async () => {
  const app = new Kernel();

  app.add((context: Context) => {
    context.request.headers.set("content-type", "application/json");

    throw new Error();
  });

  const response = await app.respond(new Request(APP_URL));

  const data = await response.json();

  assert.deepStrictEqual(data.status, 500);
});

// Error Handling - HTTP Errors (JSON).

test("test kernel handles server error JSON response", async () => {
  const app = new Kernel();

  app.add((context: Context) => {
    context.request.headers.set("content-type", "application/json");

    throw new ServerError();
  });

  const response = await app.respond(new Request(APP_URL));

  const data = await response.json();

  assert.deepStrictEqual(
    response.headers.get("content-type")?.includes("application/json"),
    true,
  );
  assert.deepStrictEqual(data.name, "Server Error");
  assert.deepStrictEqual(data.status, 500);
});

test("test kernel handles not found JSON response", async () => {
  const app = new Kernel();

  app.add((context: Context) => {
    context.request.headers.set("content-type", "application/json");

    throw new NotFound();
  });

  const response = await app.respond(new Request(APP_URL));

  const data = await response.json();

  assert.deepStrictEqual(data.name, "Not Found");
  assert.deepStrictEqual(data.status, 404);
});

test("test kernel handles bad request with errors array JSON response", async () => {
  const app = new Kernel();

  app.add((context: Context) => {
    context.request.headers.set("content-type", "application/json");

    throw new BadRequest([
      "There was an error in validation of field #1",
      "There was an error in validation of field #2",
    ]);
  });

  const response = await app.respond(new Request(APP_URL));

  const data = await response.json();

  assert.deepStrictEqual(data.name, "Bad Request");
  assert.deepStrictEqual(data.errors.length, 2);
});

// Error Handling - HTTP Errors (Plain Text).

test("test kernel handles error plain text HTTP response", async () => {
  const app = new Kernel();

  app.add((context: Context) => {
    context.request.headers.set("content-type", "text/plain");

    throw new ServerError("Test");
  });

  const response = await app.respond(new Request(APP_URL));

  const data = await response.text();

  assert.deepStrictEqual(
    response.headers.get("content-type")?.includes("text/plain"),
    true,
  );
  assert.deepStrictEqual(data, "Server Error - Test");
});

test("test kernel handles not found plain text response", async () => {
  const app = new Kernel();

  app.add(() => {
    throw new NotFound();
  });

  const response = await app.respond(new Request(APP_URL));

  assert.deepStrictEqual(
    await response.text(),
    "Not Found - The resource requested could not be found",
  );
});

test("test kernel handles server error plain text response", async () => {
  const app = new Kernel();

  app.add(() => {
    throw new ServerError();
  });

  const response = await app.respond(new Request(APP_URL));

  assert.deepStrictEqual(
    await response.text(),
    "Server Error - There was an unexpected error handling your request",
  );
});

test("test kernel handles bad request plain text response", async () => {
  const app = new Kernel();

  app.add(() => {
    throw new BadRequest([
      "There was an error in validation of field #1",
      "There was an error in validation of field #2",
    ]);
  });

  const response = await app.respond(new Request(APP_URL));

  assert.deepStrictEqual(
    await response.text(),
    "Bad Request - There was an issue handling your request",
  );
});

// Error Handling - HTTP Errors (HTML).

test("test kernel handles error HTML HTTP response", async () => {
  const app = new Kernel();

  app.add((context: Context) => {
    context.request.headers.set("content-type", "text/html");

    throw new ServerError();
  });

  const response = await app.respond(new Request(APP_URL));

  const data = await response.text();

  assert.deepStrictEqual(
    response.headers.get("content-type")?.includes("text/html"),
    true,
  );
  assert.deepStrictEqual(data.includes("<h1>Server Error</h1>"), true);
});

// Custom Error Handling.

test("test kernel uses custom error handler", async () => {
  const app = new Kernel();

  app.add(() => {
    throw new NotFound();
  });

  app.catch((context: Context) => {
    if (context.error instanceof NotFound) {
      return new Response(
        JSON.stringify({
          message: "Nothing was found",
        }),
        {
          status: 404,
        },
      );
    }
  });

  const response = await app.respond(new Request(APP_URL));

  const data = (await response.json()) as { message: string };

  assert.deepStrictEqual(data.message, "Nothing was found");
});

// Kernel Response Manager.

test("test kernel uses default response manager", async () => {
  const app = new Kernel();

  app.add(() => "Test");

  const response = await app.respond(new Request(APP_URL));

  assert.deepStrictEqual(await response.text(), "Test");
  assert.deepStrictEqual(
    app.getResponseManager() instanceof DefaultResponseManager,
    true,
  );
});

test("test kernel uses custom response manager via config", async () => {
  class CustomResponseManager extends DefaultResponseManager {}

  const app = new Kernel({
    response: {
      manager: new CustomResponseManager(),
    },
  });

  app.add(() => "Test");

  const response = await app.respond(new Request(APP_URL));

  assert.deepStrictEqual(await response.text(), "Test");
  assert.deepStrictEqual(
    app.getResponseManager() instanceof CustomResponseManager,
    true,
  );
});

test("test kernel uses custom response manager", async () => {
  const app = new Kernel();

  class CustomResponseManager extends DefaultResponseManager {}

  app.setResponseManager(new CustomResponseManager());

  app.add(() => "Test");

  const response = await app.respond(new Request(APP_URL));

  assert.deepStrictEqual(await response.text(), "Test");
  assert.deepStrictEqual(
    app.getResponseManager() instanceof CustomResponseManager,
    true,
  );
});

test("test kernel runs a chain of synchronous middleware", async () => {
  const app = new Kernel();

  const order: string[] = [];

  app.add((_context, next) => {
    order.push("first");

    return next();
  });

  app.add(() => {
    order.push("second");

    return "Test Successful";
  });

  const response = await app.respond(new Request(APP_URL));

  assert.deepStrictEqual(await response.text(), "Test Successful");
  assert.deepStrictEqual(order, ["first", "second"]);
});

test("test kernel next returns a promise for synchronous middleware", async () => {
  const app = new Kernel();

  let after = false;

  app.add((context, next) =>
    (next() as Promise<void>).then(() => {
      after = context.response.headers.get("content-type") === "text/plain";
    }),
  );

  app.add(() => "Test Successful");

  const response = await app.respond(new Request(APP_URL));

  assert.deepStrictEqual(await response.text(), "Test Successful");
  assert.deepStrictEqual(after, true);
});

test("test kernel handles an error thrown by synchronous middleware", async () => {
  const app = new Kernel();

  app.add(() => {
    throw new BadRequest(["Invalid input"]);
  });

  const response = await app.respond(new Request(APP_URL));

  assert.deepStrictEqual(response.status, 400);
});

test("test kernel runs middleware added after the first request", async () => {
  const app = new Kernel();

  app.add(async (_context, next) => {
    await next();
  });

  await app.respond(new Request(APP_URL));

  app.add(() => "Added Later");

  const response = await app.respond(new Request(APP_URL));

  assert.deepStrictEqual(await response.text(), "Added Later");
});

test("test kernel keeps the default server manager when only node options are given", () => {
  const app = new Kernel({ server: { node: { lightweight: true } } });

  assert.ok(app.getServerManager() instanceof DefaultServerManager);
});
