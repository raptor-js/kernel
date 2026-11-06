// Starts one framework's server: <node|deno> benchmarks/http-server.ts <framework> <scenario index> <port>
import Koa from "koa";
import express from "express";
import Fastify from "fastify";
import { Hono } from "hono";
import { Elysia } from "elysia";
import { H3, serve as serveH3 } from "h3";
import { serve as serveHono } from "@hono/node-server";

import Kernel from "../src/kernel.ts";

import { data, scenarios } from "./scenarios.ts";

const [name, index, portArgument] = process.argv.slice(2);

const scenario = scenarios[Number(index)];
const port = Number(portArgument);
const hostname = "127.0.0.1";

// biome-ignore lint/suspicious/noExplicitAny: the runtime global has no types here
const Deno = (globalThis as any).Deno;

// Each framework serves the scenario with its own idiomatic server for the runtime.
const servers: Record<string, () => unknown> = {
  raptor: () => {
    const app = new Kernel({ port, hostname });

    for (let i = 0; i < scenario.chain; i++) {
      app.add(async (_context, next) => {
        await next();
      });
    }

    app.add(() => (scenario.json ? data : "OK"));

    app.serve();
  },

  hono: () => {
    const app = new Hono();

    for (let i = 0; i < scenario.chain; i++) {
      app.use(async (_c, next) => {
        await next();
      });
    }

    app.use(async (c) => (scenario.json ? c.json(data) : c.text("OK")));

    if (Deno) {
      Deno.serve({ port, hostname }, app.fetch);

      return;
    }

    serveHono({ fetch: app.fetch, port, hostname });
  },

  // Elysia has no next(), so each step is an onRequest hook, its own way of running code on every request.
  elysia: () => {
    const app = new Elysia();

    for (let i = 0; i < scenario.chain; i++) {
      app.onRequest(() => {});
    }

    app.get("/", () => (scenario.json ? data : "OK"));

    Deno.serve({ port, hostname }, app.fetch);
  },

  h3: () => {
    const app = new H3();

    for (let i = 0; i < scenario.chain; i++) {
      app.use(async (_event, next) => {
        await next();
      });
    }

    app.all("/**", () => (scenario.json ? data : "OK"));

    serveH3(app, { port, hostname, silent: true });
  },

  express: () => {
    const app = express();

    for (let i = 0; i < scenario.chain; i++) {
      app.use((_request, _response, next) => next());
    }

    app.use((_request, response) => {
      if (scenario.json) {
        response.json(data);

        return;
      }

      response.send("OK");
    });

    app.listen(port, hostname);
  },

  koa: () => {
    const app = new Koa();

    for (let i = 0; i < scenario.chain; i++) {
      app.use(async (_context, next) => {
        await next();
      });
    }

    app.use((context) => {
      context.body = scenario.json ? data : "OK";
    });

    app.listen(port, hostname);
  },

  // Fastify has no next()-style middleware, so each step is an onRequest hook.
  fastify: async () => {
    const app = Fastify();

    for (let i = 0; i < scenario.chain; i++) {
      app.addHook("onRequest", async () => {});
    }

    app.get("/", async () => (scenario.json ? data : "OK"));

    await app.listen({ port, host: hostname });
  },
};

await servers[name]();
