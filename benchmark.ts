// deno-lint-ignore-file no-import-prefix

import Kernel from "./src/kernel.ts";
import type Context from "./src/context.ts";

// External frameworks for benchmark comparisons.
import { Hono } from "npm:hono@4.6.14";
import { Application } from "jsr:@oak/oak@17";

const APP_URL = "http://localhost:8000";

Deno.bench("raptor: single middleware execution", async () => {
  const app = new Kernel();

  app.add(() => "OK");

  await app.respond(new Request(APP_URL));
});

Deno.bench("hono: single middleware execution", async () => {
  const app = new Hono();

  app.use(async (c) => c.text("OK"));

  await app.fetch(new Request(APP_URL));
});

Deno.bench("oak: single middleware execution", async () => {
  const app = new Application();

  app.use((ctx) => {
    ctx.response.body = "OK";
  });

  await app.handle(new Request(APP_URL));
});

Deno.bench("raptor: 10 middleware chain", async () => {
  const app = new Kernel();

  for (let i = 0; i < 10; i++) {
    app.add(async (_ctx: Context, next: CallableFunction) => {
      await next();
    });
  }

  app.add(() => "OK");

  await app.respond(new Request(APP_URL));
});

Deno.bench("hono: 10 middleware chain", async () => {
  const app = new Hono();

  for (let i = 0; i < 10; i++) {
    app.use(async (c, next) => {
      await next();
    });
  }

  app.use(async (c) => c.text("OK"));

  await app.fetch(new Request(APP_URL));
});

Deno.bench("oak: 10 middleware chain", async () => {
  const app = new Application();

  for (let i = 0; i < 10; i++) {
    app.use(async (ctx, next) => {
      await next();
    });
  }

  app.use((ctx) => {
    ctx.response.body = "OK";
  });

  await app.handle(new Request(APP_URL));
});

Deno.bench("raptor: 50 middleware chain", async () => {
  const app = new Kernel();

  for (let i = 0; i < 50; i++) {
    app.add(async (_ctx: Context, next: CallableFunction) => {
      await next();
    });
  }

  app.add(() => "OK");

  await app.respond(new Request(APP_URL));
});

Deno.bench("hono: 50 middleware chain", async () => {
  const app = new Hono();

  for (let i = 0; i < 50; i++) {
    app.use(async (c, next) => {
      await next();
    });
  }

  app.use(async (c) => c.text("OK"));

  await app.fetch(new Request(APP_URL));
});

Deno.bench("oak: 50 middleware chain", async () => {
  const app = new Application();

  for (let i = 0; i < 50; i++) {
    app.use(async (ctx, next) => {
      await next();
    });
  }

  app.use((ctx) => {
    ctx.response.body = "OK";
  });

  await app.handle(new Request(APP_URL));
});

Deno.bench("raptor: 100 middleware chain", async () => {
  const app = new Kernel();

  for (let i = 0; i < 100; i++) {
    app.add(async (_ctx: Context, next: CallableFunction) => {
      await next();
    });
  }

  app.add(() => "OK");

  await app.respond(new Request(APP_URL));
});

Deno.bench("hono: 100 middleware chain", async () => {
  const app = new Hono();

  for (let i = 0; i < 100; i++) {
    app.use(async (c, next) => {
      await next();
    });
  }

  app.use(async (c) => c.text("OK"));

  await app.fetch(new Request(APP_URL));
});

Deno.bench("oak: 100 middleware chain", async () => {
  const app = new Application();

  for (let i = 0; i < 100; i++) {
    app.use(async (ctx, next) => {
      await next();
    });
  }

  app.use((ctx) => {
    ctx.response.body = "OK";
  });

  await app.handle(new Request(APP_URL));
});

Deno.bench("raptor: 200 middleware chain", async () => {
  const app = new Kernel();

  for (let i = 0; i < 200; i++) {
    app.add(async (_ctx: Context, next: CallableFunction) => {
      await next();
    });
  }

  app.add(() => "OK");

  await app.respond(new Request(APP_URL));
});

Deno.bench("hono: 200 middleware chain", async () => {
  const app = new Hono();

  for (let i = 0; i < 200; i++) {
    app.use(async (c, next) => {
      await next();
    });
  }

  app.use(async (c) => c.text("OK"));

  await app.fetch(new Request(APP_URL));
});

Deno.bench("oak: 200 middleware chain", async () => {
  const app = new Application();

  for (let i = 0; i < 200; i++) {
    app.use(async (ctx, next) => {
      await next();
    });
  }

  app.use((ctx) => {
    ctx.response.body = "OK";
  });

  await app.handle(new Request(APP_URL));
});

Deno.bench("raptor: JSON response processing", async () => {
  const app = new Kernel();

  const data = { items: new Array(100).fill({ id: 1, name: "test" }) };

  app.add(() => data);

  await app.respond(new Request(APP_URL));
});

Deno.bench("hono: JSON response processing", async () => {
  const app = new Hono();

  const data = { items: new Array(100).fill({ id: 1, name: "test" }) };

  app.use(async (c) => c.json(data));

  await app.fetch(new Request(APP_URL));
});

Deno.bench("oak: JSON response processing", async () => {
  const app = new Application();

  const data = { items: new Array(100).fill({ id: 1, name: "test" }) };

  app.use((ctx) => {
    ctx.response.body = data;
  });

  await app.handle(new Request(APP_URL));
});
