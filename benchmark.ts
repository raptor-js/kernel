import { bench, run } from "mitata";

import Kernel from "./src/kernel.ts";
import type Context from "./src/context.ts";

// External frameworks for benchmark comparisons.
import { Hono } from "hono";

const APP_URL = "http://localhost:8000";

bench("raptor: single middleware execution", async () => {
  const app = new Kernel();

  app.add(() => "OK");

  await app.respond(new Request(APP_URL));
});

bench("hono: single middleware execution", async () => {
  const app = new Hono();

  app.use(async (c) => c.text("OK"));

  await app.fetch(new Request(APP_URL));
});

bench("raptor: 10 middleware chain", async () => {
  const app = new Kernel();

  for (let i = 0; i < 10; i++) {
    app.add(async (_ctx: Context, next: CallableFunction) => {
      await next();
    });
  }

  app.add(() => "OK");

  await app.respond(new Request(APP_URL));
});

bench("hono: 10 middleware chain", async () => {
  const app = new Hono();

  for (let i = 0; i < 10; i++) {
    app.use(async (c, next) => {
      await next();
    });
  }

  app.use(async (c) => c.text("OK"));

  await app.fetch(new Request(APP_URL));
});

bench("raptor: 50 middleware chain", async () => {
  const app = new Kernel();

  for (let i = 0; i < 50; i++) {
    app.add(async (_ctx: Context, next: CallableFunction) => {
      await next();
    });
  }

  app.add(() => "OK");

  await app.respond(new Request(APP_URL));
});

bench("hono: 50 middleware chain", async () => {
  const app = new Hono();

  for (let i = 0; i < 50; i++) {
    app.use(async (c, next) => {
      await next();
    });
  }

  app.use(async (c) => c.text("OK"));

  await app.fetch(new Request(APP_URL));
});

bench("raptor: 100 middleware chain", async () => {
  const app = new Kernel();

  for (let i = 0; i < 100; i++) {
    app.add(async (_ctx: Context, next: CallableFunction) => {
      await next();
    });
  }

  app.add(() => "OK");

  await app.respond(new Request(APP_URL));
});

bench("hono: 100 middleware chain", async () => {
  const app = new Hono();

  for (let i = 0; i < 100; i++) {
    app.use(async (c, next) => {
      await next();
    });
  }

  app.use(async (c) => c.text("OK"));

  await app.fetch(new Request(APP_URL));
});

bench("raptor: 200 middleware chain", async () => {
  const app = new Kernel();

  for (let i = 0; i < 200; i++) {
    app.add(async (_ctx: Context, next: CallableFunction) => {
      await next();
    });
  }

  app.add(() => "OK");

  await app.respond(new Request(APP_URL));
});

bench("hono: 200 middleware chain", async () => {
  const app = new Hono();

  for (let i = 0; i < 200; i++) {
    app.use(async (c, next) => {
      await next();
    });
  }

  app.use(async (c) => c.text("OK"));

  await app.fetch(new Request(APP_URL));
});

bench("raptor: JSON response processing", async () => {
  const app = new Kernel();

  const data = { items: new Array(100).fill({ id: 1, name: "test" }) };

  app.add(() => data);

  await app.respond(new Request(APP_URL));
});

bench("hono: JSON response processing", async () => {
  const app = new Hono();

  const data = { items: new Array(100).fill({ id: 1, name: "test" }) };

  app.use(async (c) => c.json(data));

  await app.fetch(new Request(APP_URL));
});

await run();
