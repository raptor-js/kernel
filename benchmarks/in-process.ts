import { H3 } from "h3";
import { Hono } from "hono";
import { Elysia } from "elysia";
import { bench, group, run, summary } from "mitata";

import Kernel from "../src/kernel.ts";

import { data, type Scenario, scenarios } from "./scenarios.ts";

type Handler = (request: Request) => Promise<Response> | Response;

const APP_URL = "http://localhost:8000/";

// Each framework builds its app once per scenario and hands back its fetch handler.
const frameworks: Record<string, (scenario: Scenario) => Handler> = {
  raptor: (scenario) => {
    const app = new Kernel();

    for (let i = 0; i < scenario.chain; i++) {
      app.add(async (_context, next) => {
        await next();
      });
    }

    app.add(() => (scenario.json ? data : "OK"));

    return (request) => app.respond(request);
  },

  hono: (scenario) => {
    const app = new Hono();

    for (let i = 0; i < scenario.chain; i++) {
      app.use(async (_c, next) => {
        await next();
      });
    }

    app.use(async (c) => (scenario.json ? c.json(data) : c.text("OK")));

    return (request) => app.fetch(request);
  },

  h3: (scenario) => {
    const app = new H3();

    for (let i = 0; i < scenario.chain; i++) {
      app.use(async (_event, next) => {
        await next();
      });
    }

    app.all("/**", () => (scenario.json ? data : "OK"));

    return (request) => app.fetch(request);
  },

  // Elysia has no next(), so each step is an onRequest hook, its own way of running code on every request.
  elysia: (scenario) => {
    const app = new Elysia();

    for (let i = 0; i < scenario.chain; i++) {
      app.onRequest(() => {});
    }

    app.get("/", () => (scenario.json ? data : "OK"));

    return (request) => app.handle(request);
  },
};

for (const scenario of scenarios) {
  summary(() => {
    group(scenario.name, () => {
      for (const [name, build] of Object.entries(frameworks)) {
        const handle = build(scenario);

        bench(`${name}: ${scenario.name}`, async () => {
          const response = await handle(new Request(APP_URL));

          await response.text();
        });
      }
    });
  });
}

await run();
