/// <reference lib="deno.ns" />
// deno-lint-ignore-file

import { assertEquals } from "jsr:@std/assert";

import Kernel from "./kernel.ts";
import type Context from "./context.ts";
import NotFound from "./error/not-found.ts";
import BadRequest from "./error/bad-request.ts";
import ServerError from "./error/server-error.ts";
import DefaultResponseManager from "./response/manager.ts";

const APP_URL = "http://localhost:8000";

// Kernel configuration options.

Deno.test("test kernel uses default configuration options.", async () => {
  const app = new Kernel();

  assertEquals(app.getConfig().strictContentNegotiation, false);
});

Deno.test("test kernel allows configuration options.", async () => {
  const app = new Kernel({
    strictContentNegotiation: true,
  });

  assertEquals(app.getConfig().strictContentNegotiation, true);
});

// Middleware Registration.

Deno.test("test kernel handles adding middleware", async () => {
  const app = new Kernel();

  app.add(() => "Test Successful");

  const response = await app.respond(new Request(APP_URL));

  assertEquals(await response.text(), "Test Successful");
});

Deno.test("test kernel handles adding middleware with config", async () => {
  const app = new Kernel({
    middleware: [
      () => "Test Successful",
    ],
  });

  const response = await app.respond(new Request(APP_URL));

  assertEquals(await response.text(), "Test Successful");
});

Deno.test("test kernel handles alias method for adding middleware", async () => {
  const app = new Kernel();

  app.use(() => "Test Successful");

  const response = await app.respond(new Request(APP_URL));

  assertEquals(await response.text(), "Test Successful");
});

Deno.test("test middleware next callback functionality", async () => {
  const app = new Kernel();

  app.add(async (_ctx: Context, next: CallableFunction) => {
    await next();

    return "Hello from the first middleware";
  });

  app.add(() => {
    return "Hello from the second middleware";
  });

  const response = await app.respond(new Request(APP_URL));

  assertEquals(await response.text(), "Hello from the second middleware");
});

// Context Manipulation.

Deno.test("test kernel updates middleware context", async () => {
  const app = new Kernel();

  app.add((ctx: Context) => {
    ctx.response.headers.set("content-type", "application/json");

    return "Hello, Dr Malcolm!";
  });

  const response = await app.respond(new Request(APP_URL));

  assertEquals(response.headers.get("content-type"), "application/json");
});

// Error Handling - Generic Errors.

Deno.test("test kernel handles generic error with 500 status", async () => {
  const app = new Kernel();

  app.add(() => {
    throw new Error("Generic error");
  });

  const response = await app.respond(new Request(APP_URL));

  assertEquals(response.status, 500);
});

Deno.test("test kernel handles generic error status in JSON response", async () => {
  const app = new Kernel();

  app.add((context: Context) => {
    context.request.headers.set("content-type", "application/json");

    throw new Error();
  });

  const response = await app.respond(new Request(APP_URL));

  const data = await response.json();

  assertEquals(data.status, 500);
});

// Error Handling - HTTP Errors (JSON).

Deno.test("test kernel handles server error JSON response", async () => {
  const app = new Kernel();

  app.add((context: Context) => {
    context.request.headers.set("content-type", "application/json");

    throw new ServerError();
  });

  const response = await app.respond(new Request(APP_URL));

  const data = await response.json();

  assertEquals(
    response.headers.get("content-type")?.includes("application/json"),
    true,
  );
  assertEquals(data.name, "Server Error");
  assertEquals(data.status, 500);
});

Deno.test("test kernel handles not found JSON response", async () => {
  const app = new Kernel();

  app.add((context: Context) => {
    context.request.headers.set("content-type", "application/json");

    throw new NotFound();
  });

  const response = await app.respond(new Request(APP_URL));

  const data = await response.json();

  assertEquals(data.name, "Not Found");
  assertEquals(data.status, 404);
});

Deno.test("test kernel handles bad request with errors array JSON response", async () => {
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

  assertEquals(data.name, "Bad Request");
  assertEquals(data.errors.length, 2);
});

// Error Handling - HTTP Errors (Plain Text).

Deno.test("test kernel handles error plain text HTTP response", async () => {
  const app = new Kernel();

  app.add((context: Context) => {
    context.request.headers.set("content-type", "text/plain");

    throw new ServerError("Test");
  });

  const response = await app.respond(new Request(APP_URL));

  const data = await response.text();

  assertEquals(
    response.headers.get("content-type")?.includes("text/plain"),
    true,
  );
  assertEquals(data, "Server Error - Test");
});

Deno.test("test kernel handles not found plain text response", async () => {
  const app = new Kernel();

  app.add(() => {
    throw new NotFound();
  });

  const response = await app.respond(new Request(APP_URL));

  assertEquals(
    await response.text(),
    "Not Found - The resource requested could not be found",
  );
});

Deno.test("test kernel handles server error plain text response", async () => {
  const app = new Kernel();

  app.add(() => {
    throw new ServerError();
  });

  const response = await app.respond(new Request(APP_URL));

  assertEquals(
    await response.text(),
    "Server Error - There was an unexpected error handling your request",
  );
});

Deno.test("test kernel handles bad request plain text response", async () => {
  const app = new Kernel();

  app.add(() => {
    throw new BadRequest([
      "There was an error in validation of field #1",
      "There was an error in validation of field #2",
    ]);
  });

  const response = await app.respond(new Request(APP_URL));

  assertEquals(
    await response.text(),
    "Bad Request - There was an issue handling your request",
  );
});

// Error Handling - HTTP Errors (HTML).

Deno.test("test kernel handles error HTML HTTP response", async () => {
  const app = new Kernel();

  app.add((context: Context) => {
    context.request.headers.set("content-type", "text/html");

    throw new ServerError();
  });

  const response = await app.respond(new Request(APP_URL));

  const data = await response.text();

  assertEquals(
    response.headers.get("content-type")?.includes("text/html"),
    true,
  );
  assertEquals(data.includes("<h1>Server Error</h1>"), true);
});

// Custom Error Handling.

Deno.test("test kernel uses custom error handler", async () => {
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

  const data = await response.json() as { message: string };

  assertEquals(data.message, "Nothing was found");
});

// Kernel Response Manager.

Deno.test("test kernel uses default response manager", async () => {
  const app = new Kernel();

  app.add(() => "Test");

  const response = await app.respond(new Request(APP_URL));

  assertEquals(await response.text(), "Test");
  assertEquals(
    app.getResponseManager() instanceof DefaultResponseManager,
    true,
  );
});

Deno.test("test kernel uses custom response manager via config", async () => {
  class CustomResponseManager extends DefaultResponseManager {}

  const app = new Kernel({
    response: {
      manager: new CustomResponseManager(),
    },
  });

  app.add(() => "Test");

  const response = await app.respond(new Request(APP_URL));

  assertEquals(await response.text(), "Test");
  assertEquals(app.getResponseManager() instanceof CustomResponseManager, true);
});

Deno.test("test kernel uses custom response manager", async () => {
  const app = new Kernel();

  class CustomResponseManager extends DefaultResponseManager {}

  app.setResponseManager(new CustomResponseManager());

  app.add(() => "Test");

  const response = await app.respond(new Request(APP_URL));

  assertEquals(await response.text(), "Test");
  assertEquals(app.getResponseManager() instanceof CustomResponseManager, true);
});
